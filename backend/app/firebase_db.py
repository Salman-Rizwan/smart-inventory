import logging
from datetime import datetime
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore
from google.api_core.exceptions import (
    DeadlineExceeded,
    InternalServerError,
    ServiceUnavailable,
    TooManyRequests,
)
from google.api_core.retry import Retry, if_exception_type
from google.cloud.firestore_v1.base_query import FieldFilter

from app.alerts import ACTIVE_STATES, OPEN, RESOLVED, ActiveAlert, AlertPlan
from app.core.exceptions import StorageError
from app.orders import OPEN_STATES, PENDING, ActiveOrder, OrderPlan
from app.products import ProductRecord
from app.scan_records import AutoScanState, ScanRecord, ScanStatus

logger = logging.getLogger(__name__)

# Every Firestore call is bounded. The library's own policy retries a failed read for up to 300 s, and
# `timeout` alone limits only each attempt: in the Nov 4 live run a network hiccup still held a scan for
# 20 to 47 s, with the scan lock (so Scan Now waited too). Each attempt gets ATTEMPT_SECONDS and all
# attempts together TOTAL_SECONDS; then the call fails as StorageError and the best-effort steps carry on.
ATTEMPT_SECONDS = 5.0  # a cold first read measured 1.2 to 1.6 s, warm reads 0.15 to 0.4 s (Nov 5)
TOTAL_SECONDS = 10.0
TRANSIENT = if_exception_type(ServiceUnavailable, DeadlineExceeded, InternalServerError, TooManyRequests)


def make_retry(total_seconds: float = TOTAL_SECONDS) -> Retry:
    return Retry(predicate=TRANSIENT, initial=0.25, maximum=2.0, multiplier=2.0, timeout=total_seconds)


BOUNDED = {"retry": make_retry(), "timeout": ATTEMPT_SECONDS}


def _is_count(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0


def _count_or_zero(data: dict, key: str) -> int:
    return data[key] if _is_count(data.get(key)) else 0


def _time_or_none(value: object) -> datetime | None:
    return value if isinstance(value, datetime) else None


def _time_or_delete(value: datetime | None):
    return firestore.DELETE_FIELD if value is None else value


def init_firebase(key_path: Path) -> None:
    """Initialise the Firebase Admin app once (safe to call repeatedly)."""
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(credentials.Certificate(str(key_path)))


class UserRepository:
    """Reads a user's profile (users/{uid}) for the backend's role check."""

    def __init__(self):
        self.db = firestore.client()

    def get_role(self, uid: str) -> str | None:
        """The user's role, or None when the profile is missing or has no role."""
        try:
            snap = self.db.collection("users").document(uid).get(**BOUNDED)
        except Exception as exc:
            logger.exception("Firestore read of a user profile failed")
            raise StorageError() from exc
        role = (snap.to_dict() or {}).get("role") if snap.exists else None
        return role if isinstance(role, str) else None


def _auto_scan_fields(auto_scan: AutoScanState) -> dict:
    return {"enabled": auto_scan.enabled, "intervalSeconds": auto_scan.interval_seconds}


class ScanRepository:
    """Firestore reads and writes for scans. The only place that knows the schema."""

    def __init__(self):
        self.db = firestore.client()

    def save_scan(self, record: ScanRecord) -> None:
        """Add one scan record (the history the dashboard table and Insights read)."""
        try:
            self.db.collection("scans").add(
                {
                    "counts": record.counts,
                    "scannedAt": firestore.SERVER_TIMESTAMP,
                    "inferenceMs": record.inference_ms,
                    "trigger": record.trigger,
                    "brightness": record.brightness,
                    "captureMs": record.capture_ms,
                    "detectMs": record.detect_ms,
                    "heartbeat": record.heartbeat,
                    # marked, so a test scan can always be told apart from a real one
                    **({"simulated": list(record.simulated)} if record.simulated else {}),
                },
                **BOUNDED,
            )
        except Exception as exc:
            logger.exception("Firestore write of a scan failed")
            raise StorageError() from exc

    def record_status(self, status: ScanStatus) -> None:
        """Update status/latest after an attempt. A skip or failure keeps the last counts (merge); a
        counted scan replaces the counts as a whole, so a part no longer counted (a simulated test part,
        or a class removed from the model) does not linger with its last count."""
        data = {
            "lastAttemptAt": firestore.SERVER_TIMESTAMP,
            "lastTrigger": status.trigger,
            "lastOutcome": status.outcome,
            "brightness": status.brightness,
            "skipReason": status.skip_reason,
            "lastError": status.error,
            "autoScan": _auto_scan_fields(status.auto_scan),
        }
        if status.outcome == "counted":
            data.update(counts=status.counts, scannedAt=firestore.SERVER_TIMESTAMP, timings=status.timings)
        try:
            # merge on the listed fields only: each is replaced whole, nothing else in the document changes
            self.db.collection("status").document("latest").set(data, merge=list(data), **BOUNDED)
        except Exception as exc:
            logger.exception("Firestore write of status/latest failed")
            raise StorageError() from exc

    def record_scanning_settings(self, auto_scan: AutoScanState) -> None:
        """Say whether automatic scanning is on, without recording an attempt (merge). Written at startup,
        so the dashboard does not wait for the next scan to learn that scanning was turned off or on."""
        try:
            self.db.collection("status").document("latest").set(
                {"autoScan": _auto_scan_fields(auto_scan)}, merge=True, **BOUNDED
            )
        except Exception as exc:
            logger.exception("Firestore write of the scanning settings failed")
            raise StorageError() from exc

    def get_paused_until(self) -> datetime | None:
        """When Pause Scanning ends (settings/scanning.pausedUntil), or None when scanning is not paused."""
        try:
            snap = self.db.collection("settings").document("scanning").get(**BOUNDED)
        except Exception as exc:
            logger.exception("Firestore read of settings/scanning failed")
            raise StorageError() from exc
        return _time_or_none((snap.to_dict() or {}).get("pausedUntil")) if snap.exists else None

    def get_products(self) -> dict[str, ProductRecord]:
        """Products with their POS and reorder settings. A product with an invalid posCount is skipped."""
        try:
            docs = list(self.db.collection("products").stream(**BOUNDED))
        except Exception as exc:
            logger.exception("Firestore read of products failed")
            raise StorageError() from exc
        products: dict[str, ProductRecord] = {}
        for doc in docs:
            data = doc.to_dict() or {}
            if not _is_count(data.get("posCount")):
                logger.warning("Ignoring product %s: invalid posCount %r", doc.id, data.get("posCount"))
                continue
            products[doc.id] = ProductRecord(
                pos_count=data["posCount"],
                reorder_level=_count_or_zero(data, "reorderLevel"),
                reorder_qty=_count_or_zero(data, "reorderQty"),
                low_streak=_count_or_zero(data, "lowScanStreak"),
                status=data.get("status") if isinstance(data.get("status"), str) else None,
                mismatch_since=_time_or_none(data.get("mismatchSince")),
                low_since=_time_or_none(data.get("lowSince")),
                name=data["name"] if isinstance(data.get("name"), str) else None,
            )
        return products

    def save_product_statuses(self, statuses: dict[str, str]) -> None:
        """Store Matched or Mismatch on each product in one batch."""
        if not statuses:
            return
        try:
            batch = self.db.batch()
            for product_id, status in statuses.items():
                batch.update(self.db.collection("products").document(product_id), {"status": status})
            batch.commit(**BOUNDED)
        except Exception as exc:
            logger.exception("Firestore write of product statuses failed")
            raise StorageError() from exc

    def get_active_alerts(self) -> list[ActiveAlert]:
        """Open and Acknowledged alerts, oldest first. Malformed documents are skipped."""
        try:
            query = self.db.collection("alerts").where(filter=FieldFilter("state", "in", list(ACTIVE_STATES)))
            docs = sorted(query.stream(**BOUNDED), key=lambda d: d.create_time)
        except Exception as exc:
            logger.exception("Firestore read of alerts failed")
            raise StorageError() from exc
        alerts: list[ActiveAlert] = []
        for doc in docs:
            data = doc.to_dict() or {}
            product, visual, pos = data.get("product"), data.get("visualCount"), data.get("posCount")
            if isinstance(product, str) and product and _is_count(visual) and _is_count(pos):
                alerts.append(ActiveAlert(doc.id, product, data["state"], visual, pos))
            else:
                logger.warning("Ignoring malformed alert %s", doc.id)
        return alerts

    def apply_alert_plan(self, plan: AlertPlan) -> None:
        """Create, refresh and resolve alerts, and move each part's mismatch timer, in one atomic batch."""
        if plan.is_empty:
            return
        try:
            alerts = self.db.collection("alerts")
            batch = self.db.batch()
            for new in plan.create:
                batch.set(
                    alerts.document(),
                    {
                        "product": new.product,
                        "visualCount": new.visual,
                        "posCount": new.pos,
                        "state": OPEN,
                        "createdAt": firestore.SERVER_TIMESTAMP,
                    },
                )
            for upd in plan.update:
                batch.update(alerts.document(upd.id), {"visualCount": upd.visual, "posCount": upd.pos})
            for alert_id in plan.resolve:
                batch.update(
                    alerts.document(alert_id),
                    {"state": RESOLVED, "resolvedAt": firestore.SERVER_TIMESTAMP},
                )
            products = self.db.collection("products")
            for product_id, since in plan.mismatch_since.items():
                batch.update(products.document(product_id), {"mismatchSince": _time_or_delete(since)})
            batch.commit(**BOUNDED)
        except Exception as exc:
            logger.exception("Firestore write of alerts failed")
            raise StorageError() from exc

    def get_open_orders(self) -> list[ActiveOrder]:
        """Orders that are Pending, Accepted or Dispatched. Malformed documents are skipped."""
        try:
            query = self.db.collection("purchase_orders").where(
                filter=FieldFilter("state", "in", list(OPEN_STATES))
            )
            docs = list(query.stream(**BOUNDED))
        except Exception as exc:
            logger.exception("Firestore read of purchase orders failed")
            raise StorageError() from exc
        orders: list[ActiveOrder] = []
        for doc in docs:
            data = doc.to_dict() or {}
            if isinstance(data.get("product"), str) and data["product"]:
                orders.append(ActiveOrder(doc.id, data["product"], data["state"]))
            else:
                logger.warning("Ignoring malformed order %s", doc.id)
        return orders

    def apply_order_plan(self, plan: OrderPlan) -> None:
        """Create orders and update low-scan streaks and low timers in one atomic batch."""
        if plan.is_empty:
            return
        try:
            orders = self.db.collection("purchase_orders")
            products = self.db.collection("products")
            batch = self.db.batch()
            for new in plan.create:
                batch.set(
                    orders.document(),
                    {
                        "product": new.product,
                        "productName": new.product_name,
                        "qty": new.qty,
                        "state": PENDING,
                        "createdAt": firestore.SERVER_TIMESTAMP,
                        "source": "auto",
                    },
                )
            for product_id in plan.streaks.keys() | plan.low_since.keys():
                fields = {}
                if product_id in plan.streaks:
                    fields["lowScanStreak"] = plan.streaks[product_id]
                if product_id in plan.low_since:
                    fields["lowSince"] = _time_or_delete(plan.low_since[product_id])
                batch.update(products.document(product_id), fields)
            batch.commit(**BOUNDED)
        except Exception as exc:
            logger.exception("Firestore write of orders failed")
            raise StorageError() from exc

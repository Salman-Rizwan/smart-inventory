import logging
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter

from app.alerts import ACTIVE_STATES, OPEN, RESOLVED, ActiveAlert, AlertPlan
from app.core.exceptions import StorageError
from app.orders import OPEN_STATES, PENDING, ActiveOrder, OrderPlan
from app.products import ProductRecord

logger = logging.getLogger(__name__)


def _is_count(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0


def _count_or_zero(data: dict, key: str) -> int:
    return data[key] if _is_count(data.get(key)) else 0


def init_firebase(key_path: Path) -> None:
    """Initialise the Firebase Admin app once (safe to call repeatedly)."""
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(credentials.Certificate(str(key_path)))


class ScanRepository:
    """Firestore reads and writes for scans. The only place that knows the schema."""

    def __init__(self):
        self.db = firestore.client()

    def save_scan(self, counts: dict[str, int], inference_ms: int) -> None:
        now = firestore.SERVER_TIMESTAMP
        try:
            self.db.collection("scans").add({"counts": counts, "scannedAt": now, "inferenceMs": inference_ms})
            self.db.collection("status").document("latest").set({"counts": counts, "scannedAt": now})
        except Exception as exc:
            logger.exception("Firestore write failed")
            raise StorageError() from exc

    def get_products(self) -> dict[str, ProductRecord]:
        """Products with their POS and reorder settings. A product with an invalid posCount is skipped."""
        try:
            docs = list(self.db.collection("products").stream())
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
            batch.commit()
        except Exception as exc:
            logger.exception("Firestore write of product statuses failed")
            raise StorageError() from exc

    def get_active_alerts(self) -> list[ActiveAlert]:
        """Open and Acknowledged alerts, oldest first. Malformed documents are skipped."""
        try:
            query = self.db.collection("alerts").where(filter=FieldFilter("state", "in", list(ACTIVE_STATES)))
            docs = sorted(query.stream(), key=lambda d: d.create_time)
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
        """Create, refresh and resolve alerts in one atomic batch."""
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
            batch.commit()
        except Exception as exc:
            logger.exception("Firestore write of alerts failed")
            raise StorageError() from exc

    def get_open_orders(self) -> list[ActiveOrder]:
        """Orders that are Pending, Accepted or Dispatched. Malformed documents are skipped."""
        try:
            query = self.db.collection("purchase_orders").where(
                filter=FieldFilter("state", "in", list(OPEN_STATES))
            )
            docs = list(query.stream())
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
        """Create orders and update low-scan streaks in one atomic batch."""
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
                        "qty": new.qty,
                        "state": PENDING,
                        "createdAt": firestore.SERVER_TIMESTAMP,
                        "source": "auto",
                    },
                )
            for product_id, streak in plan.streaks.items():
                batch.update(products.document(product_id), {"lowScanStreak": streak})
            batch.commit()
        except Exception as exc:
            logger.exception("Firestore write of orders failed")
            raise StorageError() from exc

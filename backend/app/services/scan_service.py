import logging
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime

from app.alerts import plan_alerts
from app.camera import Camera
from app.clock import Clock, utc_now
from app.core.config import Settings
from app.core.exceptions import AppError, FrameTooDarkError, StorageError
from app.detector import Detector
from app.firebase_db import ScanRepository
from app.frame_quality import frame_brightness, is_too_dark
from app.orders import plan_orders
from app.products import ProductRecord
from app.reconcile import Reconciliation, reconcile
from app.scan_policy import MANUAL, Trigger, should_save_scan
from app.scan_records import AutoScanState, ScanRecord, ScanStatus
from app.schemas.scan import ProductCheck, ScanResponse
from app.services.snapshot_store import SnapshotStore
from app.simulation import parse_simulated_parts, with_simulated

logger = logging.getLogger(__name__)

TOO_DARK = "too_dark"


@dataclass(frozen=True)
class ScanPolicy:
    """The scanning rules from settings. The defaults keep the pre-M6 behaviour: no delays, no dark check."""

    reorder_confirm_scans: int = 2
    alert_delay_seconds: int = 0
    reorder_delay_seconds: int = 0
    min_frame_brightness: float = 0.0
    heartbeat_seconds: int = 600
    auto_scan_enabled: bool = False
    scan_interval_seconds: int = 60
    simulated_parts: dict[str, int] = field(default_factory=dict)  # live testing only (SIMULATED_PARTS)

    @classmethod
    def from_settings(cls, settings: Settings) -> "ScanPolicy":
        return cls(
            reorder_confirm_scans=settings.reorder_confirm_scans,
            alert_delay_seconds=settings.alert_delay_seconds,
            reorder_delay_seconds=settings.reorder_delay_seconds,
            min_frame_brightness=settings.min_frame_brightness,
            heartbeat_seconds=settings.scan_heartbeat_seconds,
            auto_scan_enabled=settings.auto_scan_enabled,
            scan_interval_seconds=settings.scan_interval_seconds,
            simulated_parts=parse_simulated_parts(settings.simulated_parts),
        )


def _ms_since(start: float) -> int:
    return round((time.perf_counter() - start) * 1000)


class ScanService:
    """Use case: capture, check the frame, count, store, compare with the POS, then alerts and orders.

    Used by Scan Now (manual) and by the automatic loop (auto); a lock keeps it to one scan at a time,
    because the webcam can't be shared.
    """

    def __init__(
        self,
        camera: Camera,
        detector: Detector,
        repository: ScanRepository,
        snapshots: SnapshotStore,
        policy: ScanPolicy | None = None,
        clock: Clock = utc_now,
    ):
        self.camera = camera
        self.detector = detector
        self.repository = repository
        self.snapshots = snapshots
        self.policy = policy or ScanPolicy()
        self.clock = clock
        self._lock = threading.Lock()
        self._last_saved_counts: dict[str, int] | None = None  # for change-only automatic saves
        self._last_saved_at: datetime | None = None
        self._last_counted_at: datetime | None = None  # last scan that saw the shelf (for gap detection)

    def scan(self, trigger: Trigger = MANUAL) -> ScanResponse | None:
        """Returns the result, or None when an automatic scan was skipped (too dark).

        A manual scan of a dark frame raises FrameTooDarkError instead, so Scan Now can say what to do.
        """
        with self._lock:
            return self._scan(trigger)

    def _scan(self, trigger: Trigger) -> ScanResponse | None:
        start = time.perf_counter()
        try:
            frame = self.camera.capture()
        except AppError as exc:
            self._record_status(ScanStatus(trigger, "failed", self._auto_state(), error=exc.code))
            raise
        capture_ms = _ms_since(start)

        brightness = frame_brightness(frame)
        if is_too_dark(brightness, self.policy.min_frame_brightness):
            self._record_status(
                ScanStatus(
                    trigger, "skipped", self._auto_state(), brightness=brightness, skip_reason=TOO_DARK
                )
            )
            logger.info("Scan skipped: frame too dark (brightness %.1f)", brightness)
            if trigger == MANUAL:
                raise FrameTooDarkError()
            return None

        start = time.perf_counter()
        try:
            detection = self.detector.detect(frame)
        except AppError as exc:
            self._record_status(
                ScanStatus(trigger, "failed", self._auto_state(), brightness=brightness, error=exc.code)
            )
            raise
        detect_ms = _ms_since(start)
        inference_ms = round(detection.inference_ms)
        self.snapshots.save(detection.annotated)
        counts = with_simulated(detection.counts, self.policy.simulated_parts)
        simulated = tuple(sorted(set(counts) - set(detection.counts)))

        now = self.clock()
        start = time.perf_counter()
        decision = should_save_scan(
            trigger,
            counts,
            self._last_saved_counts,
            self._last_saved_at,
            now,
            self.policy.heartbeat_seconds,
        )
        if decision.save:
            record = ScanRecord(
                counts,
                inference_ms,
                trigger,
                brightness,
                capture_ms,
                detect_ms,
                decision.heartbeat,
                simulated,
            )
            self.repository.save_scan(record)
            self._last_saved_counts, self._last_saved_at = dict(counts), now
        save_ms = _ms_since(start)

        # A gap with no counted scan (backend restarted, laptop asleep, frames too dark) is not evidence
        # that a mismatch or a low shelf lasted: the alert and order timers start again from this scan.
        restart_timers = self._is_after_gap(now)
        self._last_counted_at = now

        # Everything after the save is best effort: a failure here must not lose the scan.
        start = time.perf_counter()
        products = self._load_products()
        results = self._reconcile(counts, products)
        self._update_alerts(results, products, now, restart_timers)
        self._update_orders(counts, products, now, restart_timers)
        process_ms = _ms_since(start)

        timings = {"captureMs": capture_ms, "detectMs": detect_ms, "saveMs": save_ms, "processMs": process_ms}
        self._record_status(
            ScanStatus(
                trigger,
                "counted",
                self._auto_state(),
                counts=counts,
                brightness=brightness,
                timings=timings,
            )
        )
        logger.info("%s scan: %s (%s, saved=%s)", trigger.capitalize(), counts, timings, decision.save)
        response_products = {
            part: ProductCheck(visual=r.visual, pos=r.pos, status=r.status) for part, r in results.items()
        }
        return ScanResponse(counts=counts, inference_ms=inference_ms, products=response_products)

    def publish_settings(self) -> None:
        """Tell the dashboard at startup whether automatic scanning is on. Without this it learns of a
        change only from the next scan attempt, and with scanning off there may never be one. Best
        effort: the backend still starts when the database cannot be reached."""
        try:
            self.repository.record_scanning_settings(self._auto_state())
        except StorageError:
            logger.warning("Scanning settings not published: could not reach the database")

    def _is_after_gap(self, now: datetime) -> bool:
        """True for the first counted scan since the backend started, or after more than 3 intervals."""
        if self._last_counted_at is None:
            return True
        return (now - self._last_counted_at).total_seconds() > 3 * self.policy.scan_interval_seconds

    def _auto_state(self) -> AutoScanState:
        return AutoScanState(self.policy.auto_scan_enabled, self.policy.scan_interval_seconds)

    def _record_status(self, status: ScanStatus) -> None:
        try:
            self.repository.record_status(status)
        except StorageError:
            logger.warning("status/latest not updated: could not reach the database")

    def _load_products(self) -> dict[str, ProductRecord]:
        try:
            return self.repository.get_products()
        except StorageError:
            logger.warning("Reconciliation skipped: could not reach the products collection")
            return {}

    def _reconcile(
        self, counts: dict[str, int], products: dict[str, ProductRecord]
    ) -> dict[str, Reconciliation]:
        if not products:
            return {}
        results = reconcile(counts, {part: record.pos_count for part, record in products.items()})
        for part in sorted(set(counts) - set(results)):
            logger.warning("No valid POS record for %s; skipping reconciliation", part)
        changed = {part: r.status for part, r in results.items() if r.status != products[part].status}
        try:
            self.repository.save_product_statuses(changed)
        except StorageError:
            logger.warning("Product statuses not saved: could not reach the products collection")
        return results

    def _update_alerts(
        self,
        results: dict[str, Reconciliation],
        products: dict[str, ProductRecord],
        now: datetime,
        restart_timers: bool,
    ) -> None:
        """Open, refresh and resolve alerts. Like reconciliation, a failure must not lose the scan."""
        if not results:
            return
        try:
            plan = plan_alerts(
                results,
                self.repository.get_active_alerts(),
                now=now,
                delay_seconds=self.policy.alert_delay_seconds,
                mismatch_since={part: record.mismatch_since for part, record in products.items()},
                restart_timers=restart_timers,
            )
            self.repository.apply_alert_plan(plan)
        except StorageError:
            logger.warning("Alert update skipped: could not reach the alerts collection")
            return
        if plan.create or plan.update or plan.resolve:
            logger.info(
                "Alerts: %d opened, %d refreshed, %d resolved",
                len(plan.create),
                len(plan.update),
                len(plan.resolve),
            )

    def _update_orders(
        self, counts: dict[str, int], products: dict[str, ProductRecord], now: datetime, restart_timers: bool
    ) -> None:
        """Raise purchase orders for parts that stay low. A failure must not lose the scan."""
        if not products:
            return
        try:
            plan = plan_orders(
                counts,
                products,
                self.repository.get_open_orders(),
                self.policy.reorder_confirm_scans,
                now=now,
                delay_seconds=self.policy.reorder_delay_seconds,
                restart_timers=restart_timers,
            )
            self.repository.apply_order_plan(plan)
        except StorageError:
            logger.warning("Order update skipped: could not reach the orders collection")
            return
        if plan.create:
            logger.info("Orders raised: %s", ", ".join(f"{o.qty} x {o.product}" for o in plan.create))

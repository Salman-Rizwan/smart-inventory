import logging
import threading

from app.alerts import plan_alerts
from app.camera import Camera
from app.core.exceptions import StorageError
from app.detector import Detector
from app.firebase_db import ScanRepository
from app.orders import plan_orders
from app.products import ProductRecord
from app.reconcile import Reconciliation, reconcile
from app.schemas.scan import ProductCheck, ScanResponse
from app.services.snapshot_store import SnapshotStore

logger = logging.getLogger(__name__)


class ScanService:
    """Use case: capture, count, store, compare with the POS, then raise alerts and orders."""

    def __init__(
        self,
        camera: Camera,
        detector: Detector,
        repository: ScanRepository,
        snapshots: SnapshotStore,
        reorder_confirm_scans: int = 2,
    ):
        self.camera = camera
        self.detector = detector
        self.repository = repository
        self.snapshots = snapshots
        self.reorder_confirm_scans = reorder_confirm_scans
        self._lock = threading.Lock()  # one scan at a time; the webcam can't be shared

    def scan(self) -> ScanResponse:
        with self._lock:
            frame = self.camera.capture()
            detection = self.detector.detect(frame)
            inference_ms = round(detection.inference_ms)
            self.snapshots.save(detection.annotated)
            self.repository.save_scan(detection.counts, inference_ms)
            # Everything after the save is best effort: a failure here must not lose the scan.
            products = self._load_products()
            results = self._reconcile(detection.counts, products)
            self._update_alerts(results)
            self._update_orders(detection.counts, products)
        logger.info("Scan complete: %s in %d ms", detection.counts, inference_ms)
        response_products = {
            part: ProductCheck(visual=r.visual, pos=r.pos, status=r.status) for part, r in results.items()
        }
        return ScanResponse(counts=detection.counts, inference_ms=inference_ms, products=response_products)

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
        try:
            self.repository.save_product_statuses({part: r.status for part, r in results.items()})
        except StorageError:
            logger.warning("Product statuses not saved: could not reach the products collection")
        return results

    def _update_alerts(self, results: dict[str, Reconciliation]) -> None:
        """Open, refresh and resolve alerts. Like reconciliation, a failure must not lose the scan."""
        if not results:
            return
        try:
            plan = plan_alerts(results, self.repository.get_active_alerts())
            self.repository.apply_alert_plan(plan)
        except StorageError:
            logger.warning("Alert update skipped: could not reach the alerts collection")
            return
        if not plan.is_empty:
            logger.info(
                "Alerts: %d opened, %d refreshed, %d resolved",
                len(plan.create),
                len(plan.update),
                len(plan.resolve),
            )

    def _update_orders(self, counts: dict[str, int], products: dict[str, ProductRecord]) -> None:
        """Raise purchase orders for parts that stay low. A failure must not lose the scan."""
        if not products:
            return
        try:
            plan = plan_orders(
                counts, products, self.repository.get_open_orders(), self.reorder_confirm_scans
            )
            self.repository.apply_order_plan(plan)
        except StorageError:
            logger.warning("Order update skipped: could not reach the orders collection")
            return
        if plan.create:
            logger.info("Orders raised: %s", ", ".join(f"{o.qty} x {o.product}" for o in plan.create))

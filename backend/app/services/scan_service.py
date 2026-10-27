import logging
import threading

from app.alerts import plan_alerts
from app.camera import Camera
from app.core.exceptions import StorageError
from app.detector import Detector
from app.firebase_db import ScanRepository
from app.reconcile import Reconciliation, reconcile
from app.schemas.scan import ProductCheck, ScanResponse
from app.services.snapshot_store import SnapshotStore

logger = logging.getLogger(__name__)


class ScanService:
    """Use case: capture a frame, count the parts, store the result, compare with the POS."""

    def __init__(
        self, camera: Camera, detector: Detector, repository: ScanRepository, snapshots: SnapshotStore
    ):
        self.camera = camera
        self.detector = detector
        self.repository = repository
        self.snapshots = snapshots
        self._lock = threading.Lock()  # one scan at a time; the webcam can't be shared

    def scan(self) -> ScanResponse:
        with self._lock:
            frame = self.camera.capture()
            detection = self.detector.detect(frame)
            inference_ms = round(detection.inference_ms)
            self.snapshots.save(detection.annotated)
            self.repository.save_scan(detection.counts, inference_ms)
            results = self._reconcile(detection.counts)
            self._update_alerts(results)
        logger.info("Scan complete: %s in %d ms", detection.counts, inference_ms)
        products = {
            part: ProductCheck(visual=r.visual, pos=r.pos, status=r.status) for part, r in results.items()
        }
        return ScanResponse(counts=detection.counts, inference_ms=inference_ms, products=products)

    def _reconcile(self, counts: dict[str, int]) -> dict[str, Reconciliation]:
        """Compare with the POS. The scan is already saved, so a failure here must not lose it."""
        try:
            pos_counts = self.repository.get_pos_counts()
            results = reconcile(counts, pos_counts)
            for part in sorted(set(counts) - set(results)):
                logger.warning("No valid POS record for %s; skipping reconciliation", part)
            self.repository.save_product_statuses({part: r.status for part, r in results.items()})
        except StorageError:
            logger.warning("Reconciliation skipped: could not reach the products collection")
            return {}
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

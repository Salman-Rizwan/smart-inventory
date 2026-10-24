import logging
import threading

from app.camera import Camera
from app.detector import Detector
from app.firebase_db import ScanRepository
from app.schemas.scan import ScanResponse
from app.services.snapshot_store import SnapshotStore

logger = logging.getLogger(__name__)


class ScanService:
    """Use case: capture a frame, count the parts, store the result."""

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
        logger.info("Scan complete: %s in %d ms", detection.counts, inference_ms)
        return ScanResponse(counts=detection.counts, inference_ms=inference_ms)

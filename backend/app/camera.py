import logging

import cv2
import numpy as np

from app.core.exceptions import CameraError

logger = logging.getLogger(__name__)

WARMUP_FRAMES = 15  # first frames are dark while auto-exposure settles
FLUSH_FRAMES = 5  # frames buffered by the driver since the last scan; dropped so the capture is current


class Camera:
    """Captures a single frame from a webcam.

    By default the camera is opened for each capture and released afterwards (about 1.2 s, mostly the
    warm-up frames). With `keep_open` (automatic scanning on) it stays open between scans, so a scan
    only drops the few stale buffered frames before reading; a failed read reopens it once. Measured
    Nov 4: capture was about 70% of a scan's backend time.
    """

    def __init__(self, index: int, keep_open: bool = False):
        self.index = index
        self.keep_open = keep_open
        self._cam = None

    def capture(self) -> np.ndarray:
        if not self.keep_open:
            cam = self._open()
            try:
                return self._read(cam)
            finally:
                cam.release()
        if self._cam is None:
            self._cam = self._open()
        try:
            for _ in range(FLUSH_FRAMES):
                self._cam.grab()
            return self._read(self._cam)
        except CameraError:
            logger.warning("Camera read failed; reopening it once")
            self.release()
            self._cam = self._open()
            return self._read(self._cam)

    def release(self) -> None:
        if self._cam is not None:
            self._cam.release()
            self._cam = None

    def _open(self):
        cam = cv2.VideoCapture(self.index)
        if not cam.isOpened():
            cam.release()
            raise CameraError()
        for _ in range(WARMUP_FRAMES):
            cam.read()
        return cam

    @staticmethod
    def _read(cam) -> np.ndarray:
        ok, frame = cam.read()
        if not ok or frame is None:
            raise CameraError()
        return frame

import cv2
import numpy as np

from app.core.exceptions import CameraError

WARMUP_FRAMES = 15  # first frames are dark while auto-exposure settles


class Camera:
    """Captures a single frame from a webcam."""

    def __init__(self, index: int):
        self.index = index

    def capture(self) -> np.ndarray:
        cam = cv2.VideoCapture(self.index)
        try:
            if not cam.isOpened():
                raise CameraError()
            for _ in range(WARMUP_FRAMES):
                cam.read()
            ok, frame = cam.read()
        finally:
            cam.release()
        if not ok or frame is None:
            raise CameraError()
        return frame

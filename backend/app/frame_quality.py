"""Is a frame good enough to count? A dark room reads as an empty shelf, so dark frames are skipped."""

import cv2
import numpy as np


def frame_brightness(frame: np.ndarray) -> float:
    """Mean grey level, 0 (black) to 255 (white). Colour frames are BGR, as OpenCV captures them."""
    if frame is None or frame.size == 0:
        raise ValueError("empty frame")
    grey = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if frame.ndim == 3 else frame
    return round(float(np.mean(grey)), 1)


def is_too_dark(brightness: float, minimum: float) -> bool:
    """Exactly at the minimum is bright enough."""
    return brightness < minimum

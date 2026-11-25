from pathlib import Path

import cv2
import numpy as np

from app.core.exceptions import NotFoundError, StorageError


class SnapshotStore:
    """Keeps the latest annotated image on local disk."""

    def __init__(self, path: Path):
        self.path = path

    def save(self, image: np.ndarray) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not cv2.imwrite(str(self.path), image):
            raise StorageError("Could not save the snapshot image.")

    def latest(self) -> Path:
        if not self.path.exists():
            raise NotFoundError("No scan yet.")
        return self.path

import time
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from ultralytics import YOLO

from app.core.exceptions import DetectionError


@dataclass(frozen=True)
class Detection:
    counts: dict[str, int]
    inference_ms: float
    annotated: np.ndarray


class Detector:
    """Wraps the YOLO model. Load once at startup; reuse for every scan."""

    def __init__(self, model_path: Path, conf: float):
        self.conf = conf
        self.model = YOLO(str(model_path))

    def warmup(self, frame: np.ndarray) -> None:
        self.detect(frame)

    def detect(self, frame: np.ndarray) -> Detection:
        try:
            start = time.perf_counter()
            result = self.model.predict(frame, conf=self.conf, verbose=False)[0]
            inference_ms = (time.perf_counter() - start) * 1000
            found = Counter(self.model.names[int(c)] for c in result.boxes.cls)
            # every class is always present, so a part with none on the shelf reads 0
            counts = {name: found.get(name, 0) for name in self.model.names.values()}
            return Detection(counts, inference_ms, result.plot())
        except Exception as exc:
            raise DetectionError() from exc

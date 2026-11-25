import logging
import time
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from ultralytics import YOLO

from app.core.exceptions import DetectionError

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Detection:
    counts: dict[str, int]
    inference_ms: float
    annotated: np.ndarray
    ignored: int = 0  # boxes dropped by the oversize guard


def count_parts(names: dict[int, str], class_ids: np.ndarray) -> dict[str, int]:
    """Count per class. Every class is always present, so a part with none on the shelf reads 0."""
    found = Counter(names[int(c)] for c in class_ids)
    return {name: found.get(name, 0) for name in names.values()}


class Detector:
    """Wraps the YOLO model. Load once at startup; reuse for every scan."""

    def __init__(self, model, conf: float, max_box_area_ratio: float, max_box_side_ratio: float):
        self.model = model
        self.conf = conf
        self.max_box_area_ratio = max_box_area_ratio
        self.max_box_side_ratio = max_box_side_ratio

    @classmethod
    def from_path(
        cls, model_path: Path, conf: float, max_box_area_ratio: float, max_box_side_ratio: float
    ) -> "Detector":
        return cls(YOLO(str(model_path)), conf, max_box_area_ratio, max_box_side_ratio)

    def warmup(self, frame: np.ndarray) -> None:
        self.detect(frame)

    def detect(self, frame: np.ndarray) -> Detection:
        try:
            start = time.perf_counter()
            result = self.model.predict(frame, conf=self.conf, verbose=False)[0]
            inference_ms = (time.perf_counter() - start) * 1000

            # The model has no "not a part" class, so people and rooms can score as parts.
            # Those boxes are huge, or stretch across most of the frame in one direction (an arm or
            # sleeve is wide but short). A real part on a shelf is small in both directions.
            sizes = result.boxes.xywhn.cpu().numpy()[:, 2:4]  # normalised width, height
            areas = sizes[:, 0] * sizes[:, 1]
            keep = (areas <= self.max_box_area_ratio) & (sizes.max(axis=1) <= self.max_box_side_ratio)
            ignored = int((~keep).sum())
            if ignored:
                logger.warning(
                    "Ignored %d oversized detection(s) (area > %.0f%% or a side > %.0f%% of the frame)",
                    ignored,
                    self.max_box_area_ratio * 100,
                    self.max_box_side_ratio * 100,
                )
                result = result[keep]

            class_ids = result.boxes.cls.cpu().numpy()
            counts = count_parts(self.model.names, class_ids)
            return Detection(counts, inference_ms, result.plot(), ignored)
        except Exception as exc:
            raise DetectionError() from exc

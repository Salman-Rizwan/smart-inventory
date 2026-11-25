import logging

import numpy as np

from app.core.exceptions import DetectionError
from app.detector import Detector, count_parts

NAMES = {0: "spark_plug", 1: "petrol_filter"}


class FakeTensor:
    def __init__(self, array):
        self.array = np.asarray(array, dtype=float)

    def cpu(self):
        return self

    def numpy(self):
        return self.array


class FakeBoxes:
    def __init__(self, cls, wh):
        self.cls = FakeTensor(cls)
        self.xywhn = FakeTensor(np.array([[0.5, 0.5, w, h] for w, h in wh]).reshape(-1, 4))


class FakeResult:
    def __init__(self, cls, wh):
        self.boxes = FakeBoxes(cls, wh)
        self._cls, self._wh = list(cls), list(wh)

    def __getitem__(self, keep):
        kept = [i for i, k in enumerate(keep) if k]
        return FakeResult([self._cls[i] for i in kept], [self._wh[i] for i in kept])

    def plot(self):
        return np.zeros((4, 4, 3), dtype=np.uint8)


class FakeModel:
    names = NAMES

    def __init__(self, cls, wh):
        self.result = FakeResult(cls, wh)

    def predict(self, frame, conf, verbose):
        return [self.result]


def detect(cls, wh, ratio=0.25, side=0.6):
    detector = Detector(FakeModel(cls, wh), conf=0.5, max_box_area_ratio=ratio, max_box_side_ratio=side)
    return detector.detect(np.zeros((8, 8, 3)))


def test_count_parts_reports_every_class_even_at_zero():
    assert count_parts(NAMES, np.array([0, 0, 1])) == {"spark_plug": 2, "petrol_filter": 1}
    assert count_parts(NAMES, np.array([])) == {"spark_plug": 0, "petrol_filter": 0}


def test_small_boxes_are_counted():
    d = detect([0, 0, 1], [(0.1, 0.2), (0.1, 0.2), (0.2, 0.2)])
    assert d.counts == {"spark_plug": 2, "petrol_filter": 1}
    assert d.ignored == 0


def test_oversized_box_is_ignored_and_logged(caplog):
    with caplog.at_level(logging.WARNING):
        d = detect([0, 0], [(0.1, 0.2), (0.9, 0.8)])
    assert d.counts["spark_plug"] == 1
    assert d.ignored == 1
    assert "oversized" in caplog.text


def test_wide_but_short_box_is_ignored():
    # an arm or sleeve across the top of the frame: area is only ~12% but it spans 94% of the width
    d = detect([0, 0], [(0.1, 0.35), (0.94, 0.13)])
    assert d.counts["spark_plug"] == 1
    assert d.ignored == 1


def test_tall_thin_box_is_ignored():
    assert detect([0], [(0.05, 0.8)]).counts["spark_plug"] == 0


def test_realistic_parts_are_never_ignored():
    # four upright plugs and a filter, sized like the real webcam frame
    d = detect([0, 0, 0, 0, 1], [(0.09, 0.35)] * 4 + [(0.17, 0.32)])
    assert d.counts == {"spark_plug": 4, "petrol_filter": 1}
    assert d.ignored == 0


def test_box_exactly_at_the_limit_is_kept():
    assert detect([0], [(0.5, 0.5)]).counts["spark_plug"] == 1


def test_all_boxes_oversized_reads_as_empty_shelf():
    d = detect([0, 1], [(0.9, 0.9), (0.8, 0.9)])
    assert d.counts == {"spark_plug": 0, "petrol_filter": 0}
    assert d.ignored == 2


def test_no_detections():
    d = detect([], [])
    assert d.counts == {"spark_plug": 0, "petrol_filter": 0}
    assert d.ignored == 0


def test_model_failure_becomes_detection_error():
    class Broken:
        names = NAMES

        def predict(self, *args, **kwargs):
            raise RuntimeError("boom")

    try:
        Detector(Broken(), 0.5, 0.25, 0.6).detect(np.zeros((8, 8, 3)))
    except DetectionError:
        return
    raise AssertionError("expected DetectionError")

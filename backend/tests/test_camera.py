"""The webcam adapter with a fake cv2.VideoCapture: open per scan, or kept open with flush and reopen."""

import numpy as np
import pytest

import app.camera as camera_module
from app.camera import FLUSH_FRAMES, WARMUP_FRAMES, Camera
from app.core.exceptions import CameraError

FRAME = np.full((4, 4, 3), 120, dtype=np.uint8)


class FakeCapture:
    instances = []

    def __init__(self, index, opened=True, fail_reads=0):
        self.index = index
        self.opened = opened
        self.fail_reads = fail_reads  # reads after warm-up that fail
        self.reads = 0
        self.grabs = 0
        self.released = False
        FakeCapture.instances.append(self)

    def isOpened(self):
        return self.opened

    def read(self):
        self.reads += 1
        if self.reads > WARMUP_FRAMES and self.fail_reads > 0:
            self.fail_reads -= 1
            return False, None
        return True, FRAME

    def grab(self):
        self.grabs += 1
        return True

    def release(self):
        self.released = True


@pytest.fixture
def captures(monkeypatch):
    FakeCapture.instances = []
    plan = {"opened": True, "fail_reads": [0]}

    def factory(index):
        fails = plan["fail_reads"].pop(0) if plan["fail_reads"] else 0
        return FakeCapture(index, plan["opened"], fails)

    monkeypatch.setattr(camera_module.cv2, "VideoCapture", factory)
    return plan


def test_by_default_it_opens_warms_up_reads_and_releases_every_time(captures):
    cam = Camera(2)
    assert cam.capture() is FRAME
    cam.capture()
    assert len(FakeCapture.instances) == 2 and all(c.released for c in FakeCapture.instances)
    assert FakeCapture.instances[0].index == 2 and FakeCapture.instances[0].reads == WARMUP_FRAMES + 1


def test_kept_open_it_warms_up_once_and_flushes_stale_frames_before_each_capture(captures):
    cam = Camera(0, keep_open=True)
    cam.capture()
    cam.capture()
    (cap,) = FakeCapture.instances
    assert cap.released is False
    assert cap.reads == WARMUP_FRAMES + 2 and cap.grabs == 2 * FLUSH_FRAMES


def test_kept_open_a_failed_read_reopens_the_camera_once(captures):
    captures["fail_reads"] = [0, 0]
    cam = Camera(0, keep_open=True)
    cam.capture()
    FakeCapture.instances[0].fail_reads = 1  # e.g. the camera was unplugged and plugged back in
    assert cam.capture() is FRAME
    first, second = FakeCapture.instances
    assert first.released and not second.released


def test_kept_open_a_camera_that_stays_broken_raises(captures):
    cam = Camera(0, keep_open=True)
    cam.capture()
    FakeCapture.instances[0].fail_reads = 5
    captures["fail_reads"] = [5]
    with pytest.raises(CameraError):
        cam.capture()


def test_a_camera_that_will_not_open_raises_and_is_released(captures):
    captures["opened"] = False
    for cam in (Camera(0), Camera(0, keep_open=True)):
        with pytest.raises(CameraError):
            cam.capture()
    assert all(c.released for c in FakeCapture.instances)


def test_release_closes_a_kept_open_camera_and_a_later_capture_reopens_it(captures):
    cam = Camera(0, keep_open=True)
    cam.capture()
    cam.release()
    assert FakeCapture.instances[0].released
    cam.capture()
    assert len(FakeCapture.instances) == 2
    cam.release()
    cam.release()  # releasing twice is harmless

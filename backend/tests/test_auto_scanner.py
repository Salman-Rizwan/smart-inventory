"""The automatic scanning loop: ticks, never overlapping Scan Now, surviving failures, stopping promptly."""

import threading
import time

from app.core.exceptions import CameraError, StorageError
from app.services.auto_scanner import AutoScanner


class FakeService:
    def __init__(self, error=None, hold=0.0):
        self.calls = []
        self.error = error
        self.hold = hold
        self._lock = threading.Lock()
        self.overlaps = 0

    def scan(self, trigger="manual"):
        if not self._lock.acquire(blocking=False):
            self.overlaps += 1
            self._lock.acquire()
        try:
            self.calls.append(trigger)
            time.sleep(self.hold)
            if self.error:
                raise self.error
        finally:
            self._lock.release()


def wait_for(condition, timeout=2.0):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if condition():
            return True
        time.sleep(0.01)
    return False


def test_one_tick_runs_an_automatic_scan():
    service = FakeService()
    AutoScanner(service, 60).run_once()
    assert service.calls == ["auto"]


def test_a_paused_tick_scans_nothing():
    service = FakeService()
    AutoScanner(service, 60, is_paused=lambda: True).run_once()
    assert service.calls == []


def test_camera_storage_and_unexpected_errors_never_escape_a_tick():
    for error in [CameraError(), StorageError(), RuntimeError("boom")]:
        AutoScanner(FakeService(error=error), 60).run_once()  # must not raise


def test_a_failing_pause_check_is_logged_and_the_tick_carries_on():
    def broken():
        raise RuntimeError("pause document unreadable")

    AutoScanner(FakeService(), 60, is_paused=broken).run_once()  # must not raise


def test_the_loop_scans_at_once_then_keeps_going_after_failures_and_stops_promptly():
    service = FakeService(error=CameraError())
    scanner = AutoScanner(service, 0.05)
    scanner.start()
    assert wait_for(lambda: len(service.calls) >= 3)  # failing scans did not end the loop
    started = time.monotonic()
    scanner.stop()
    assert time.monotonic() - started < 1.0
    assert not scanner.running
    count = len(service.calls)
    time.sleep(0.2)
    assert len(service.calls) == count  # nothing after stop


def test_stop_does_not_wait_for_the_interval():
    service = FakeService()
    scanner = AutoScanner(service, 3600)  # an hour between scans
    scanner.start()
    assert wait_for(lambda: service.calls == ["auto"])
    started = time.monotonic()
    scanner.stop()
    assert time.monotonic() - started < 1.0


def test_starting_twice_runs_one_loop():
    service = FakeService()
    scanner = AutoScanner(service, 3600)
    scanner.start()
    first = scanner._thread
    scanner.start()
    assert scanner._thread is first
    scanner.stop()


def test_scan_now_during_an_automatic_scan_waits_instead_of_overlapping(tmp_path):
    # the real service lock: an automatic scan holding the camera makes Scan Now wait its turn
    from app.services.scan_service import ScanService
    from app.services.snapshot_store import SnapshotStore
    from tests.conftest import FakeCamera, FakeDetector, FakeRepository

    class SlowCamera(FakeCamera):
        def capture(self):
            time.sleep(0.2)
            return super().capture()

    camera = SlowCamera()
    service = ScanService(camera, FakeDetector(), FakeRepository(), SnapshotStore(tmp_path / "latest.jpg"))
    inside = []
    original = service._scan

    def tracked(trigger):
        inside.append(trigger)
        assert len(inside) == 1, "two scans overlapped"
        try:
            return original(trigger)
        finally:
            inside.pop()

    service._scan = tracked
    auto = threading.Thread(target=service.scan, args=("auto",))
    auto.start()
    time.sleep(0.05)
    assert service.scan("manual") is not None
    auto.join()
    assert camera.captures == 2


# --- Pause Scanning ---

from datetime import UTC, datetime, timedelta  # noqa: E402

from app.services.auto_scanner import pause_check  # noqa: E402

NOW = datetime(2026, 11, 11, 9, 0, tzinfo=UTC)


class PauseRepo:
    def __init__(self, until=None, fail=False):
        self.until = until
        self.fail = fail

    def get_paused_until(self):
        if self.fail:
            raise StorageError()
        return self.until


def test_paused_until_a_time_in_the_future():
    assert pause_check(PauseRepo(NOW + timedelta(minutes=10)), lambda: NOW)() is True


def test_a_pause_that_has_ended_or_was_never_set_is_not_a_pause():
    assert pause_check(PauseRepo(NOW - timedelta(seconds=1)), lambda: NOW)() is False
    assert pause_check(PauseRepo(NOW), lambda: NOW)() is False
    assert pause_check(PauseRepo(None), lambda: NOW)() is False


def test_an_unreadable_pause_setting_scans_as_normal():
    assert pause_check(PauseRepo(fail=True), lambda: NOW)() is False


def test_a_paused_tick_releases_the_camera_and_does_not_scan():
    service = FakeService()
    released = []
    AutoScanner(service, 60, is_paused=lambda: True, on_pause=lambda: released.append(1)).run_once()
    assert service.calls == [] and released == [1]


def test_scanning_resumes_by_itself_when_the_pause_ends():
    now = [NOW]
    repo = PauseRepo(NOW + timedelta(minutes=15))
    service = FakeService()
    scanner = AutoScanner(service, 60, is_paused=pause_check(repo, lambda: now[0]))
    scanner.run_once()
    now[0] = NOW + timedelta(minutes=15, seconds=1)
    scanner.run_once()
    assert service.calls == ["auto"]

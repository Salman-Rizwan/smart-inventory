"""M6 through the real ScanService with fakes: dark frames, change-only saves, heartbeat, status after
every attempt, write counts, and the alert and order delays over time."""

import pytest

from app.core.exceptions import CameraError, FrameTooDarkError
from app.services.scan_service import ScanPolicy, ScanService
from app.services.snapshot_store import SnapshotStore
from tests.conftest import FakeCamera, FakeClock, FakeDetector, FakeRepository

MATCHING = {"spark_plug": 4, "petrol_filter": 1}


def plug_orders(repo):
    """The fake gives every part the same reorder level, so the filter (1 on the shelf) can be low too."""
    return [(o["product"], o["state"]) for o in repo.orders if o["product"] == "spark_plug"]


@pytest.fixture
def setup(tmp_path):
    def _make(policy=None, camera=None, counts=None, **repo_kwargs):
        repo = FakeRepository(pos_counts=dict(MATCHING), **repo_kwargs)
        detector = FakeDetector(counts or dict(MATCHING))
        clock = FakeClock()
        service = ScanService(
            camera or FakeCamera(),
            detector,
            repo,
            SnapshotStore(tmp_path / "latest.jpg"),
            policy or ScanPolicy(min_frame_brightness=40, heartbeat_seconds=600, auto_scan_enabled=True),
            clock,
        )
        return service, detector, repo, clock

    return _make


# --- dark frames ---


def test_scan_now_in_the_dark_says_what_to_do_and_changes_nothing(setup):
    service, _, repo, _ = setup(camera=FakeCamera(brightness=10))
    with pytest.raises(FrameTooDarkError, match="Turn on the shelf light"):
        service.scan("manual")
    assert repo.saved == [] and repo.statuses == [] and repo.alerts == [] and repo.orders == []
    (status,) = repo.status_writes
    assert (status.outcome, status.skip_reason, status.brightness) == ("skipped", "too_dark", 10)


def test_an_automatic_scan_in_the_dark_is_skipped_quietly(setup):
    service, _, repo, _ = setup(camera=FakeCamera(brightness=0), reorder_level=5)
    assert service.scan("auto") is None
    assert repo.saved == [] and repo.alerts == [] and repo.orders == [] and repo.streaks == {}
    assert repo.status_writes[-1].counts is None  # the last real counts stay on the dashboard


def test_a_dark_night_never_orders_stock(setup):
    # the bug this guards against: a dark shop reads as an empty shelf, which is "low" for every part
    service, _, repo, clock = setup(camera=FakeCamera(brightness=5), reorder_level=0)
    for _ in range(60):
        service.scan("auto")
        clock.advance(60)
    assert repo.orders == [] and repo.alerts == []


def test_a_minimum_of_zero_turns_the_dark_check_off(setup):
    service, _, repo, _ = setup(policy=ScanPolicy(min_frame_brightness=0), camera=FakeCamera(brightness=0))
    assert service.scan("manual") is not None
    assert len(repo.saved) == 1


# --- failures are recorded for the dashboard ---


@pytest.mark.parametrize("trigger", ["manual", "auto"])
def test_a_camera_failure_is_recorded_and_still_raised(setup, trigger):
    service, _, repo, _ = setup(camera=FakeCamera(fail=True))
    with pytest.raises(CameraError):
        service.scan(trigger)
    (status,) = repo.status_writes
    assert (status.outcome, status.error, status.trigger) == ("failed", "camera_unavailable", trigger)


def test_a_status_write_failure_never_loses_the_scan(setup):
    service, _, repo, _ = setup()
    repo.status_fail = True
    assert service.scan("manual").counts == MATCHING
    assert len(repo.saved) == 1


# --- change-only saves and the heartbeat ---


def test_scan_now_always_saves_a_record(setup):
    service, _, repo, _ = setup()
    service.scan("manual")
    service.scan("manual")
    assert [r.trigger for r in repo.saved] == ["manual", "manual"]


def test_automatic_scans_save_only_on_change_and_at_the_heartbeat(setup):
    service, detector, repo, clock = setup()
    service.scan("auto")  # first after start: saved
    for _ in range(9):  # 9 more minutes, unchanged
        clock.advance(60)
        service.scan("auto")
    assert len(repo.saved) == 1
    clock.advance(60)  # 600 s since the last save: heartbeat
    service.scan("auto")
    assert [r.heartbeat for r in repo.saved] == [False, True]
    clock.advance(60)
    detector.counts = {"spark_plug": 3, "petrol_filter": 1}  # a plug taken
    service.scan("auto")
    assert (
        len(repo.saved) == 3
        and repo.saved[-1].heartbeat is False
        and repo.saved[-1].counts["spark_plug"] == 3
    )


def test_a_manual_scan_resets_the_heartbeat(setup):
    service, _, repo, clock = setup()
    service.scan("auto")
    clock.advance(500)
    service.scan("manual")
    clock.advance(500)
    service.scan("auto")  # 500 s after the manual save: not due
    assert len(repo.saved) == 2


def test_a_record_carries_its_trigger_brightness_and_timings(setup):
    service, _, repo, _ = setup()
    service.scan("auto")
    (record,) = repo.saved
    assert (record.trigger, record.brightness, record.inference_ms) == ("auto", 128, 412)
    assert isinstance(record.capture_ms, int) and record.capture_ms >= 0
    assert isinstance(record.detect_ms, int) and record.detect_ms >= 0


def test_every_counted_attempt_updates_the_status_with_counts_timings_and_settings(setup):
    service, _, repo, _ = setup(policy=ScanPolicy(auto_scan_enabled=True, scan_interval_seconds=45))
    service.scan("auto")
    status = repo.status_writes[-1]
    assert (status.outcome, status.counts, status.error, status.skip_reason) == (
        "counted",
        MATCHING,
        None,
        None,
    )
    assert set(status.timings) == {"captureMs", "detectMs", "saveMs", "processMs"}
    assert all(isinstance(v, int) and v >= 0 for v in status.timings.values())
    assert (status.auto_scan.enabled, status.auto_scan.interval_seconds) == (True, 45)


@pytest.mark.parametrize("enabled", [True, False])
def test_startup_publishes_whether_scanning_is_on_without_claiming_an_attempt(setup, enabled):
    # with scanning off there may be no scan at all, so the dashboard must not wait for one to find out
    service, _, repo, _ = setup(policy=ScanPolicy(auto_scan_enabled=enabled, scan_interval_seconds=45))
    service.publish_settings()
    assert [(s.enabled, s.interval_seconds) for s in repo.settings_writes] == [(enabled, 45)]
    assert repo.status_writes == [] and repo.saved == [] and repo.writes == 1


def test_startup_carries_on_when_the_settings_cannot_be_published(setup):
    service, _, repo, _ = setup()
    repo.status_fail = True
    service.publish_settings()  # logged, never raised: the backend must still start offline
    assert repo.settings_writes == []
    repo.status_fail = False
    assert service.scan("manual").counts == MATCHING


def test_a_quiet_automatic_scan_costs_one_write(setup):
    # steady state: nothing changed, so only status/latest is written (the free-tier budget assumes this)
    service, _, repo, clock = setup()
    service.scan("auto")
    clock.advance(60)
    before = repo.writes
    service.scan("auto")
    assert repo.writes - before == 1


def test_product_statuses_are_written_only_when_they_change(setup):
    service, detector, repo, clock = setup()
    service.scan("auto")
    clock.advance(60)
    service.scan("auto")
    assert repo.statuses == [{"spark_plug": "Matched", "petrol_filter": "Matched"}]
    detector.counts = {"spark_plug": 3, "petrol_filter": 1}
    clock.advance(60)
    service.scan("auto")
    assert repo.statuses[-1] == {"spark_plug": "Mismatch"}


# --- the alert and order delays over time ---


def test_an_alert_waits_for_the_delay_then_opens_and_resolves_at_once(setup):
    policy = ScanPolicy(alert_delay_seconds=180, auto_scan_enabled=True)
    service, detector, repo, clock = setup(policy=policy)
    detector.counts = {"spark_plug": 3, "petrol_filter": 1}
    for _ in range(3):  # 0, 60, 120 s: under the delay
        service.scan("auto")
        clock.advance(60)
    assert repo.alerts == []
    service.scan("auto")  # 180 s
    assert [(a["product"], a["state"]) for a in repo.alerts] == [("spark_plug", "Open")]
    detector.counts = dict(MATCHING)
    clock.advance(60)
    service.scan("auto")
    assert repo.alerts[0]["state"] == "Resolved" and repo.mismatch_since["spark_plug"] is None


def test_a_sale_recorded_within_the_delay_raises_no_alert(setup):
    policy = ScanPolicy(alert_delay_seconds=180, auto_scan_enabled=True)
    service, detector, repo, clock = setup(policy=policy)
    detector.counts = {"spark_plug": 3, "petrol_filter": 1}  # a customer took a plug
    service.scan("auto")
    clock.advance(60)
    repo.pos_counts["spark_plug"] = 3  # the sale is recorded at the till
    service.scan("auto")
    clock.advance(600)
    service.scan("auto")
    assert repo.alerts == []


def test_an_order_waits_for_the_streak_and_the_delay(setup):
    policy = ScanPolicy(reorder_confirm_scans=2, reorder_delay_seconds=300, auto_scan_enabled=True)
    service, detector, repo, clock = setup(policy=policy, reorder_level=3)
    detector.counts = {"spark_plug": 3, "petrol_filter": 1}
    for _ in range(5):  # 0 to 240 s: low, streak met after the second, delay not yet
        service.scan("auto")
        clock.advance(60)
    assert plug_orders(repo) == []
    service.scan("auto")  # 300 s
    assert plug_orders(repo) == [("spark_plug", "Pending")]


def test_restocking_within_the_delay_orders_nothing(setup):
    policy = ScanPolicy(reorder_confirm_scans=2, reorder_delay_seconds=300, auto_scan_enabled=True)
    service, detector, repo, clock = setup(policy=policy, reorder_level=3)
    detector.counts = {"spark_plug": 1, "petrol_filter": 1}  # shelf half-emptied while restocking
    for _ in range(4):
        service.scan("auto")
        clock.advance(60)
    detector.counts = {"spark_plug": 6, "petrol_filter": 1}  # restocked
    service.scan("auto")
    clock.advance(600)
    service.scan("auto")
    assert plug_orders(repo) == [] and repo.low_since["spark_plug"] is None


def test_with_delays_at_zero_two_scan_now_presses_still_order_for_the_demo(setup):
    service, detector, repo, _ = setup(policy=ScanPolicy(reorder_confirm_scans=2), reorder_level=3)
    detector.counts = {"spark_plug": 3, "petrol_filter": 1}
    service.scan("manual")
    assert plug_orders(repo) == []
    service.scan("manual")
    assert plug_orders(repo) == [("spark_plug", "Pending")]


# --- gaps: nobody watched the shelf, so a timer must not count the gap (found live on Nov 5) ---

GAP_POLICY = ScanPolicy(
    min_frame_brightness=40,
    alert_delay_seconds=180,
    reorder_delay_seconds=300,
    auto_scan_enabled=True,
    scan_interval_seconds=30,
)


def test_a_timer_left_from_before_a_restart_does_not_open_an_alert(setup):
    service, detector, repo, clock = setup(policy=GAP_POLICY)
    repo.mismatch_since["spark_plug"] = clock.now.replace(day=clock.now.day - 1)  # left over from yesterday
    detector.counts = {"spark_plug": 0, "petrol_filter": 1}  # a hand over the lens
    service.scan("auto")
    assert repo.alerts == [] and repo.mismatch_since["spark_plug"] == clock.now
    for _ in range(6):  # still mismatched, watched every 30 s for 3 minutes
        clock.advance(30)
        service.scan("auto")
    assert [(a["product"], a["state"]) for a in repo.alerts] == [("spark_plug", "Open")]


def test_a_laptop_that_slept_mid_mismatch_starts_the_timer_again(setup):
    service, detector, repo, clock = setup(policy=GAP_POLICY)
    service.scan("auto")
    detector.counts = {"spark_plug": 2, "petrol_filter": 1}
    service.scan("auto")  # the mismatch begins
    clock.advance(4 * 3600)  # asleep for 4 hours
    service.scan("auto")
    assert repo.alerts == []
    clock.advance(30)
    service.scan("auto")
    assert repo.alerts == []  # 30 s of watched mismatch, not 4 hours


def test_dark_frames_in_between_count_as_a_gap(setup):
    service, detector, repo, clock = setup(policy=GAP_POLICY)
    camera = service.camera
    service.scan("auto")
    detector.counts = {"spark_plug": 2, "petrol_filter": 1}
    service.scan("auto")
    camera.brightness = 5  # lights off for 10 minutes: every scan skipped
    for _ in range(20):
        clock.advance(30)
        service.scan("auto")
    camera.brightness = 128
    clock.advance(30)
    service.scan("auto")
    assert repo.alerts == []


def test_scans_at_the_normal_pace_are_not_a_gap(setup):
    service, detector, repo, clock = setup(policy=GAP_POLICY)
    service.scan("auto")
    detector.counts = {"spark_plug": 2, "petrol_filter": 1}
    for _ in range(7):  # 0 to 180 s, with one slow scan in between (still under 3 intervals)
        service.scan("auto")
        clock.advance(30)
    assert [(a["product"], a["state"]) for a in repo.alerts] == [("spark_plug", "Open")]


def test_a_part_low_before_a_restart_needs_a_fresh_streak_and_delay(setup):
    service, detector, repo, clock = setup(policy=GAP_POLICY, reorder_level=3)
    repo.streaks["spark_plug"] = 2
    repo.low_since["spark_plug"] = clock.now.replace(hour=clock.now.hour - 4)
    detector.counts = {"spark_plug": 1, "petrol_filter": 5}
    repo.pos_counts["petrol_filter"] = 5
    service.scan("auto")
    assert plug_orders(repo) == [] and repo.streaks["spark_plug"] == 1

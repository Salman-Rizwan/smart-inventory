import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_defaults():
    s = Settings(_env_file=None)
    assert s.camera_index == 0
    assert s.detection_conf == 0.5
    assert s.max_box_area_ratio == 0.25
    assert s.max_box_side_ratio == 0.6
    assert s.reorder_confirm_scans == 2


def test_detection_conf_from_env(monkeypatch):
    monkeypatch.setenv("DETECTION_CONF", "0.3")
    assert Settings(_env_file=None).detection_conf == 0.3


def test_camera_index_from_env(monkeypatch):
    monkeypatch.setenv("CAMERA_INDEX", "2")
    assert Settings(_env_file=None).camera_index == 2


@pytest.mark.parametrize(
    "name,value",
    [
        ("CAMERA_INDEX", "-1"),
        ("CAMERA_INDEX", "abc"),
        ("DETECTION_CONF", "1.5"),
        ("MAX_BOX_AREA_RATIO", "0"),
        ("MAX_BOX_AREA_RATIO", "1.5"),
        ("MAX_BOX_SIDE_RATIO", "0"),
        ("MAX_BOX_SIDE_RATIO", "2"),
        ("REORDER_CONFIRM_SCANS", "0"),
        ("REORDER_CONFIRM_SCANS", "1.5"),
    ],
)
def test_invalid_settings_rejected(monkeypatch, name, value):
    monkeypatch.setenv(name, value)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


# --- automatic scanning (M6) ---


def test_automatic_scanning_defaults_off_with_the_agreed_rules():
    s = Settings(_env_file=None)
    assert s.auto_scan_enabled is False
    assert (s.scan_interval_seconds, s.scan_heartbeat_seconds) == (60, 600)
    assert (s.alert_delay_seconds, s.reorder_delay_seconds) == (180, 300)
    assert s.min_frame_brightness == 40


@pytest.mark.parametrize("value,expected", [("true", True), ("1", True), ("false", False), ("0", False)])
def test_the_switch_reads_true_and_false(monkeypatch, value, expected):
    monkeypatch.setenv("AUTO_SCAN_ENABLED", value)
    assert Settings(_env_file=None).auto_scan_enabled is expected


def test_delays_of_zero_are_allowed_for_demos(monkeypatch):
    monkeypatch.setenv("ALERT_DELAY_SECONDS", "0")
    monkeypatch.setenv("REORDER_DELAY_SECONDS", "0")
    s = Settings(_env_file=None)
    assert (s.alert_delay_seconds, s.reorder_delay_seconds) == (0, 0)


@pytest.mark.parametrize(
    "name,value",
    [
        ("AUTO_SCAN_ENABLED", "maybe"),
        ("SCAN_INTERVAL_SECONDS", "9"),
        ("SCAN_INTERVAL_SECONDS", "abc"),
        ("ALERT_DELAY_SECONDS", "-1"),
        ("REORDER_DELAY_SECONDS", "-5"),
        ("MIN_FRAME_BRIGHTNESS", "-1"),
        ("MIN_FRAME_BRIGHTNESS", "256"),
    ],
)
def test_invalid_scanning_settings_are_refused(monkeypatch, name, value):
    monkeypatch.setenv(name, value)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_the_heartbeat_cannot_be_shorter_than_the_interval(monkeypatch):
    monkeypatch.setenv("SCAN_INTERVAL_SECONDS", "120")
    monkeypatch.setenv("SCAN_HEARTBEAT_SECONDS", "60")
    with pytest.raises(
        ValidationError, match="SCAN_HEARTBEAT_SECONDS must be at least SCAN_INTERVAL_SECONDS"
    ):
        Settings(_env_file=None)


def test_the_scan_policy_takes_every_rule_from_the_settings(monkeypatch):
    from app.services.scan_service import ScanPolicy

    monkeypatch.setenv("AUTO_SCAN_ENABLED", "true")
    monkeypatch.setenv("SCAN_INTERVAL_SECONDS", "30")
    policy = ScanPolicy.from_settings(Settings(_env_file=None))
    assert policy == ScanPolicy(
        reorder_confirm_scans=2,
        alert_delay_seconds=180,
        reorder_delay_seconds=300,
        min_frame_brightness=40,
        heartbeat_seconds=600,
        auto_scan_enabled=True,
        scan_interval_seconds=30,
    )

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_defaults():
    s = Settings(_env_file=None)
    assert s.camera_index == 0
    assert s.detection_conf == 0.5


def test_detection_conf_from_env(monkeypatch):
    monkeypatch.setenv("DETECTION_CONF", "0.3")
    assert Settings(_env_file=None).detection_conf == 0.3


def test_camera_index_from_env(monkeypatch):
    monkeypatch.setenv("CAMERA_INDEX", "2")
    assert Settings(_env_file=None).camera_index == 2


@pytest.mark.parametrize(
    "name,value",
    [("CAMERA_INDEX", "-1"), ("CAMERA_INDEX", "abc"), ("DETECTION_CONF", "1.5")],
)
def test_invalid_settings_rejected(monkeypatch, name, value):
    monkeypatch.setenv(name, value)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)

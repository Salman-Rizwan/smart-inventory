"""Startup wiring through the real lifespan, with the heavy parts (Firebase, model, webcam) replaced."""

import pytest
from fastapi.testclient import TestClient

from app import main
from app.core.config import Settings
from tests.conftest import FakeCamera, FakeDetector, FakeRepository, FakeUsers


class ReleasableCamera(FakeCamera):
    def __init__(self, index, keep_open=False):
        super().__init__()
        self.released = False

    def release(self):
        self.released = True


@pytest.fixture
def start(monkeypatch, tmp_path):
    def _start(repo=None, **settings):
        repo = repo or FakeRepository()
        monkeypatch.setattr(main, "init_firebase", lambda key_path: None)
        monkeypatch.setattr(main, "ScanRepository", lambda: repo)
        monkeypatch.setattr(main, "UserRepository", lambda: FakeUsers())
        monkeypatch.setattr(main, "Camera", ReleasableCamera)
        monkeypatch.setattr(main.Detector, "from_path", lambda *args: FakeDetector())
        app = main.create_app(Settings(_env_file=None, snapshot_path=tmp_path / "latest.jpg", **settings))
        return app, repo

    return _start


def test_startup_tells_the_dashboard_that_scanning_is_off_before_any_scan(start):
    app, repo = start(auto_scan_enabled=False, scan_interval_seconds=30)
    with TestClient(app):
        assert [(s.enabled, s.interval_seconds) for s in repo.settings_writes] == [(False, 30)]
        assert repo.status_writes == [] and app.state.auto_scanner is None
    assert app.state.scan_service.camera.released


def test_the_backend_still_starts_when_the_database_cannot_be_reached(start):
    repo = FakeRepository()
    repo.status_fail = True
    app, _ = start(repo, auto_scan_enabled=False)
    with TestClient(app) as client:
        assert client.get("/health").status_code == 200
    assert repo.settings_writes == []

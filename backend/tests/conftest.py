import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.core.exceptions import CameraError, StorageError
from app.core.security import get_current_user
from app.detector import Detection
from app.main import create_app
from app.services.scan_service import ScanService
from app.services.snapshot_store import SnapshotStore


class FakeCamera:
    def __init__(self, fail=False):
        self.fail = fail

    def capture(self):
        if self.fail:
            raise CameraError()
        return np.zeros((10, 10, 3), dtype=np.uint8)


class FakeDetector:
    def detect(self, frame):
        return Detection({"spark_plug": 3, "petrol_filter": 1}, 412.4, np.zeros((10, 10, 3), dtype=np.uint8))


class FakeRepository:
    def __init__(self, fail=False):
        self.fail = fail
        self.saved = []

    def save_scan(self, counts, inference_ms):
        if self.fail:
            raise StorageError()
        self.saved.append((counts, inference_ms))


@pytest.fixture
def make_client(tmp_path):
    def _make(camera=None, repository=None, authenticated=True):
        app = create_app()
        repo = repository or FakeRepository()
        store = SnapshotStore(tmp_path / "latest.jpg")
        app.state.snapshot_store = store
        app.state.scan_service = ScanService(camera or FakeCamera(), FakeDetector(), repo, store)
        if authenticated:
            app.dependency_overrides[get_current_user] = lambda: {"uid": "test-user"}
        return TestClient(app, raise_server_exceptions=False), repo

    return _make

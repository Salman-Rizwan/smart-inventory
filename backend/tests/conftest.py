import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.alerts import ACTIVE_STATES, ActiveAlert
from app.core.exceptions import CameraError, StorageError
from app.core.security import get_current_user
from app.detector import Detection
from app.main import create_app
from app.orders import OPEN_STATES, ActiveOrder
from app.products import ProductRecord
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
    def __init__(self, counts=None):
        self.counts = counts or {"spark_plug": 3, "petrol_filter": 1}

    def detect(self, frame):
        return Detection(dict(self.counts), 412.4, np.zeros((10, 10, 3), dtype=np.uint8))


class FakeRepository:
    def __init__(
        self,
        fail=False,
        pos_counts=None,
        products_fail=False,
        alerts_fail=False,
        orders_fail=False,
        reorder_level=0,  # 0 keeps ordering out of the way of tests that are about something else
        reorder_qty=10,
    ):
        self.fail = fail
        self.products_fail = products_fail
        self.alerts_fail = alerts_fail
        self.orders_fail = orders_fail
        self.reorder_level = reorder_level
        self.reorder_qty = reorder_qty
        self.streaks = {}
        self.orders = []  # dicts: id, product, qty, state
        self.alerts = []  # dicts: id, product, state, visual, pos
        self.pos_counts = {"spark_plug": 3, "petrol_filter": 1} if pos_counts is None else pos_counts
        self.saved = []
        self.statuses = []

    def save_scan(self, counts, inference_ms):
        if self.fail:
            raise StorageError()
        self.saved.append((counts, inference_ms))

    def get_products(self):
        if self.products_fail:
            raise StorageError()
        return {
            part: ProductRecord(pos, self.reorder_level, self.reorder_qty, self.streaks.get(part, 0))
            for part, pos in self.pos_counts.items()
        }

    def get_open_orders(self):
        if self.orders_fail:
            raise StorageError()
        return [
            ActiveOrder(o["id"], o["product"], o["state"]) for o in self.orders if o["state"] in OPEN_STATES
        ]

    def apply_order_plan(self, plan):
        if self.orders_fail:
            raise StorageError()
        for new in plan.create:
            self.orders.append(
                {"id": f"o{len(self.orders) + 1}", "product": new.product, "qty": new.qty, "state": "Pending"}
            )
        self.streaks.update(plan.streaks)

    def save_product_statuses(self, statuses):
        self.statuses.append(statuses)

    def get_active_alerts(self):
        if self.alerts_fail:
            raise StorageError()
        return [
            ActiveAlert(a["id"], a["product"], a["state"], a["visual"], a["pos"])
            for a in self.alerts
            if a["state"] in ACTIVE_STATES
        ]

    def apply_alert_plan(self, plan):
        if self.alerts_fail:
            raise StorageError()
        for new in plan.create:
            self.alerts.append(
                {
                    "id": f"a{len(self.alerts) + 1}",
                    "product": new.product,
                    "state": "Open",
                    "visual": new.visual,
                    "pos": new.pos,
                }
            )
        by_id = {a["id"]: a for a in self.alerts}
        for upd in plan.update:
            by_id[upd.id].update(visual=upd.visual, pos=upd.pos)
        for alert_id in plan.resolve:
            by_id[alert_id]["state"] = "Resolved"


@pytest.fixture
def make_client(tmp_path):
    def _make(camera=None, repository=None, detector=None, authenticated=True):
        app = create_app()
        repo = repository or FakeRepository()
        store = SnapshotStore(tmp_path / "latest.jpg")
        app.state.snapshot_store = store
        app.state.scan_service = ScanService(camera or FakeCamera(), detector or FakeDetector(), repo, store)
        if authenticated:
            app.dependency_overrides[get_current_user] = lambda: {"uid": "test-user"}
        return TestClient(app, raise_server_exceptions=False), repo

    return _make

from datetime import UTC, datetime, timedelta

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


class FakeClock:
    """A clock the test moves by hand."""

    def __init__(self, start=datetime(2026, 11, 5, 9, 0, tzinfo=UTC)):
        self.now = start

    def __call__(self):
        return self.now

    def advance(self, seconds):
        self.now += timedelta(seconds=seconds)


class FakeCamera:
    """A mid-grey frame (brightness 128) unless told to fail or to be dark."""

    def __init__(self, fail=False, brightness=128):
        self.fail = fail
        self.brightness = brightness
        self.captures = 0

    def capture(self):
        self.captures += 1
        if self.fail:
            raise CameraError()
        return np.full((10, 10, 3), self.brightness, dtype=np.uint8)


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
        self.saved = []  # ScanRecord per scan record written
        self.statuses = []  # each save_product_statuses call
        self.status_writes = []  # ScanStatus per status/latest write
        self.product_status = {}
        self.mismatch_since = {}
        self.low_since = {}
        self.status_fail = False
        self.writes = 0  # Firestore write calls the real repository would make (empty plans write nothing)

    def save_scan(self, record):
        if self.fail:
            raise StorageError()
        self.saved.append(record)
        self.writes += 1

    def record_status(self, status):
        if self.status_fail:
            raise StorageError()
        self.status_writes.append(status)
        self.writes += 1

    def get_products(self):
        if self.products_fail:
            raise StorageError()
        return {
            part: ProductRecord(
                pos,
                self.reorder_level,
                self.reorder_qty,
                self.streaks.get(part, 0),
                status=self.product_status.get(part),
                mismatch_since=self.mismatch_since.get(part),
                low_since=self.low_since.get(part),
            )
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
        self.writes += 0 if plan.is_empty else 1
        for new in plan.create:
            self.orders.append(
                {"id": f"o{len(self.orders) + 1}", "product": new.product, "qty": new.qty, "state": "Pending"}
            )
        self.streaks.update(plan.streaks)
        self.low_since.update(plan.low_since)

    def save_product_statuses(self, statuses):
        if statuses:  # the real repository writes nothing for an empty dict
            self.statuses.append(statuses)
            self.writes += 1
        self.product_status.update(statuses)

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
        self.writes += 0 if plan.is_empty else 1
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
        self.mismatch_since.update(plan.mismatch_since)


@pytest.fixture
def make_client(tmp_path):
    def _make(camera=None, repository=None, detector=None, authenticated=True, policy=None):
        app = create_app()
        repo = repository or FakeRepository()
        store = SnapshotStore(tmp_path / "latest.jpg")
        app.state.snapshot_store = store
        app.state.scan_service = ScanService(
            camera or FakeCamera(), detector or FakeDetector(), repo, store, policy=policy
        )
        if authenticated:
            app.dependency_overrides[get_current_user] = lambda: {"uid": "test-user"}
        return TestClient(app, raise_server_exceptions=False), repo

    return _make

"""The M9 done-when through the real ScanService with fakes: low stock raises exactly one order per part."""

import pytest

from app.services.scan_service import ScanService
from app.services.snapshot_store import SnapshotStore
from tests.conftest import FakeCamera, FakeDetector, FakeRepository


@pytest.fixture
def setup(tmp_path):
    def _make(confirm=2, **repo_kwargs):
        repo_kwargs.setdefault("reorder_level", 2)
        repo = FakeRepository(pos_counts={"spark_plug": 4, "petrol_filter": 1}, **repo_kwargs)
        detector = FakeDetector({"spark_plug": 4, "petrol_filter": 1})
        service = ScanService(
            FakeCamera(),
            detector,
            repo,
            SnapshotStore(tmp_path / "latest.jpg"),
            reorder_confirm_scans=confirm,
        )
        return service, detector, repo

    return _make


def orders(repo):
    return [(o["product"], o["qty"], o["state"]) for o in repo.orders]


def test_the_filter_is_already_low_so_it_orders_on_the_second_scan_only(setup):
    service, _, repo = setup()
    service.scan()
    assert repo.orders == []
    service.scan()
    assert orders(repo) == [("petrol_filter", 10, "Pending")]


def test_removing_plugs_below_the_reorder_level_raises_one_order_however_many_scans(setup):
    service, detector, repo = setup()
    detector.counts = {"spark_plug": 1, "petrol_filter": 5}  # plugs removed; filter well stocked
    for _ in range(6):
        service.scan()
    assert orders(repo) == [("spark_plug", 10, "Pending")]


def test_two_low_parts_each_get_exactly_one_order(setup):
    service, detector, repo = setup()
    detector.counts = {"spark_plug": 0, "petrol_filter": 0}
    for _ in range(5):
        service.scan()
    assert sorted(orders(repo)) == [("petrol_filter", 10, "Pending"), ("spark_plug", 10, "Pending")]


def test_one_bad_frame_never_orders(setup):
    service, detector, repo = setup()
    detector.counts = {"spark_plug": 4, "petrol_filter": 5}
    service.scan()
    detector.counts = {"spark_plug": 0, "petrol_filter": 5}  # a hand over the camera for one scan
    service.scan()
    detector.counts = {"spark_plug": 4, "petrol_filter": 5}
    service.scan()
    detector.counts = {"spark_plug": 0, "petrol_filter": 5}  # and again, but not in a row
    service.scan()
    assert repo.orders == []


def test_an_open_order_blocks_another_for_the_same_part(setup):
    service, detector, repo = setup()
    detector.counts = {"spark_plug": 0, "petrol_filter": 5}
    service.scan()
    service.scan()
    for state in ("Accepted", "Dispatched"):
        repo.orders[0]["state"] = state
        for _ in range(4):
            service.scan()
        assert len(repo.orders) == 1, state


def test_after_the_order_is_received_a_part_that_is_still_low_needs_fresh_low_scans(setup):
    service, detector, repo = setup()
    detector.counts = {"spark_plug": 0, "petrol_filter": 5}
    service.scan()
    service.scan()
    repo.orders[0]["state"] = "Received"
    service.scan()  # first low scan since receipt: starts the count, no order yet
    assert len(repo.orders) == 1
    service.scan()
    assert [o["state"] for o in repo.orders] == ["Received", "Pending"]


def test_a_well_stocked_shelf_never_orders(setup):
    service, detector, repo = setup()
    detector.counts = {"spark_plug": 4, "petrol_filter": 5}
    for _ in range(5):
        service.scan()
    assert repo.orders == []


def test_confirming_after_one_scan(setup):
    service, detector, repo = setup(confirm=1)
    detector.counts = {"spark_plug": 0, "petrol_filter": 5}
    service.scan()
    assert orders(repo) == [("spark_plug", 10, "Pending")]


def test_the_order_uses_the_products_reorder_quantity(setup):
    service, detector, repo = setup(reorder_qty=25)
    detector.counts = {"spark_plug": 0, "petrol_filter": 5}
    service.scan()
    service.scan()
    assert orders(repo) == [("spark_plug", 25, "Pending")]


def test_a_product_with_no_reorder_quantity_never_orders(setup):
    service, detector, repo = setup(reorder_qty=0)
    detector.counts = {"spark_plug": 0, "petrol_filter": 0}
    for _ in range(4):
        service.scan()
    assert repo.orders == []


def test_an_order_failure_does_not_lose_the_scan_or_the_alerts(setup):
    service, detector, repo = setup(orders_fail=True)
    detector.counts = {"spark_plug": 0, "petrol_filter": 5}
    response = service.scan()
    service.scan()
    assert len(repo.saved) == 2
    assert response.products["spark_plug"].status == "Mismatch"
    # both parts are mismatched against the POS, so the alerts still opened even though ordering failed
    assert sorted(a["product"] for a in repo.alerts) == ["petrol_filter", "spark_plug"]
    assert repo.orders == []


def test_no_order_changes_when_the_products_cannot_be_read(setup):
    service, detector, repo = setup(products_fail=True)
    detector.counts = {"spark_plug": 0, "petrol_filter": 0}
    service.scan()
    service.scan()
    assert len(repo.saved) == 2
    assert repo.orders == [] and repo.streaks == {}

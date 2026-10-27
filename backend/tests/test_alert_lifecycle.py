"""The M8 done-when through the real ScanService with fakes: one alert across 5 scans, fixed -> closed."""

import pytest

from app.services.scan_service import ScanService
from app.services.snapshot_store import SnapshotStore
from tests.conftest import FakeCamera, FakeDetector, FakeRepository


@pytest.fixture
def setup(tmp_path):
    def _make(pos_counts=None, **repo_kwargs):
        repo = FakeRepository(pos_counts=pos_counts or {"spark_plug": 4, "petrol_filter": 1}, **repo_kwargs)
        detector = FakeDetector({"spark_plug": 4, "petrol_filter": 1})
        service = ScanService(FakeCamera(), detector, repo, SnapshotStore(tmp_path / "latest.jpg"))
        return service, detector, repo

    return _make


def states(repo):
    return [(a["product"], a["state"]) for a in repo.alerts]


def test_no_alert_while_everything_matches(setup):
    service, _, repo = setup()
    for _ in range(3):
        service.scan()
    assert repo.alerts == []


def test_a_mismatch_produces_exactly_one_alert_across_five_scans(setup):
    service, detector, repo = setup()
    service.scan()
    detector.counts = {"spark_plug": 3, "petrol_filter": 1}  # a plug is removed, the POS is unchanged
    for _ in range(5):
        service.scan()
    assert states(repo) == [("spark_plug", "Open")]


def test_fixing_the_mismatch_closes_the_alert(setup):
    service, detector, repo = setup()
    detector.counts = {"spark_plug": 3, "petrol_filter": 1}
    service.scan()
    detector.counts = {"spark_plug": 4, "petrol_filter": 1}  # the plug is put back
    service.scan()
    assert states(repo) == [("spark_plug", "Resolved")]


def test_a_mismatch_that_returns_opens_a_new_alert(setup):
    service, detector, repo = setup()
    detector.counts = {"spark_plug": 3, "petrol_filter": 1}
    service.scan()
    detector.counts = {"spark_plug": 4, "petrol_filter": 1}
    service.scan()
    detector.counts = {"spark_plug": 2, "petrol_filter": 1}
    service.scan()
    assert states(repo) == [("spark_plug", "Resolved"), ("spark_plug", "Open")]


def test_an_acknowledged_alert_stays_until_the_counts_match(setup):
    service, detector, repo = setup()
    detector.counts = {"spark_plug": 3, "petrol_filter": 1}
    service.scan()
    repo.alerts[0]["state"] = "Acknowledged"  # the shopkeeper clicked Acknowledge
    service.scan()
    assert states(repo) == [("spark_plug", "Acknowledged")]
    detector.counts = {"spark_plug": 4, "petrol_filter": 1}
    service.scan()
    assert states(repo) == [("spark_plug", "Resolved")]


def test_the_active_alert_shows_the_latest_counts(setup):
    service, detector, repo = setup()
    detector.counts = {"spark_plug": 3, "petrol_filter": 1}
    service.scan()
    detector.counts = {"spark_plug": 1, "petrol_filter": 1}
    service.scan()
    assert len(repo.alerts) == 1
    assert (repo.alerts[0]["visual"], repo.alerts[0]["pos"]) == (1, 4)


def test_an_empty_shelf_raises_an_alert_for_every_part_with_stock(setup):
    service, detector, repo = setup()
    detector.counts = {"spark_plug": 0, "petrol_filter": 0}
    service.scan()
    assert sorted(states(repo)) == [("petrol_filter", "Open"), ("spark_plug", "Open")]


def test_a_part_with_no_pos_record_never_raises_an_alert(setup):
    service, detector, repo = setup(pos_counts={"petrol_filter": 1})
    detector.counts = {"spark_plug": 9, "petrol_filter": 1}
    service.scan()
    assert repo.alerts == []


def test_an_alert_failure_does_not_lose_the_scan(setup):
    service, detector, repo = setup(alerts_fail=True)
    detector.counts = {"spark_plug": 3, "petrol_filter": 1}
    response = service.scan()
    assert len(repo.saved) == 1
    assert response.products["spark_plug"].status == "Mismatch"


def test_no_alert_changes_when_the_pos_cannot_be_read(setup):
    service, detector, repo = setup(products_fail=True)
    detector.counts = {"spark_plug": 3, "petrol_filter": 1}
    service.scan()
    assert len(repo.saved) == 1
    assert repo.alerts == []

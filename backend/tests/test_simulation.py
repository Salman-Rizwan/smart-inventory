"""Simulated parts (live testing only): parsing, guards, and how they join a scan."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.services.scan_service import ScanPolicy, ScanService
from app.services.snapshot_store import SnapshotStore
from app.simulation import parse_simulated_parts, with_simulated
from tests.conftest import FakeCamera, FakeDetector, FakeRepository

REAL = {"spark_plug": 4, "petrol_filter": 1}


@pytest.mark.parametrize(
    "text,expected",
    [
        ("", {}),
        ("   ", {}),
        ("zz_part:0", {"zz_part": 0}),
        (" zz_part:0 , zz_air_filter_2:12 ,", {"zz_part": 0, "zz_air_filter_2": 12}),
    ],
)
def test_parsing(text, expected):
    assert parse_simulated_parts(text) == expected


@pytest.mark.parametrize(
    "text",
    [
        "spark_plug:3",  # a real part can never be faked
        "part:0",  # no zz_ prefix
        "ZZ_part:0",  # upper case
        "zz_part",  # no count
        "zz_part:-1",
        "zz_part:1.5",
        "zz_part:abc",
        "zz_part:1234567",  # over six digits
        "zz_part:0,zz_part:1",  # named twice
        "zz part:0",
    ],
)
def test_anything_else_is_refused_with_a_readable_message(text):
    with pytest.raises(ValueError, match="SIMULATED_PARTS"):
        parse_simulated_parts(text)


def test_a_bad_value_stops_startup_and_the_default_is_off():
    assert Settings(_env_file=None).simulated_parts == ""
    with pytest.raises(ValidationError, match="SIMULATED_PARTS entry 'spark_plug:3' is not valid"):
        Settings(_env_file=None, simulated_parts="spark_plug:3")


def test_a_part_the_model_counts_keeps_its_own_count():
    assert with_simulated(REAL, {"zz_part": 0}) == {"zz_part": 0, **REAL}
    assert with_simulated({"zz_part": 2}, {"zz_part": 9}) == {"zz_part": 2}
    assert with_simulated(REAL, {}) == REAL


@pytest.fixture
def service(tmp_path):
    def _make(simulated, pos_counts):
        repo = FakeRepository(pos_counts=pos_counts, reorder_level=0, reorder_qty=3)
        svc = ScanService(
            FakeCamera(),
            FakeDetector(dict(REAL)),
            repo,
            SnapshotStore(tmp_path / "latest.jpg"),
            ScanPolicy(reorder_confirm_scans=2, simulated_parts=simulated),
        )
        return svc, repo

    return _make


def test_a_simulated_part_goes_through_the_whole_pipeline_and_is_marked(service):
    svc, repo = service({"zz_part": 0}, {**REAL, "zz_part": 0})
    result = svc.scan("manual")
    assert result.counts == {**REAL, "zz_part": 0}
    assert repo.saved[-1].simulated == ("zz_part",)
    assert repo.status_writes[-1].counts["zz_part"] == 0
    svc.scan("manual")  # low (0 at level 0) for two scans: the real order planner raises an order
    assert [(o["product"], o["qty"]) for o in repo.orders] == [("zz_part", 3)]


def test_a_simulated_mismatch_is_reconciled_like_a_real_one(service):
    svc, repo = service({"zz_part": 0}, {**REAL, "zz_part": 5})
    assert svc.scan("manual").products["zz_part"].status == "Mismatch"
    assert [a["product"] for a in repo.alerts] == ["zz_part"]


def test_without_simulated_parts_nothing_changes(service):
    svc, repo = service({}, dict(REAL))
    assert svc.scan("manual").counts == REAL
    assert repo.saved[-1].simulated == ()


def test_the_scan_record_is_marked_only_when_a_part_is_simulated():
    from unittest.mock import MagicMock

    from app.firebase_db import ScanRepository
    from app.scan_records import ScanRecord

    repo = ScanRepository.__new__(ScanRepository)
    repo.db = MagicMock()
    repo.save_scan(ScanRecord({"spark_plug": 4}, 25, "auto", 174.0, 190, 25))
    repo.save_scan(ScanRecord({"zz_part": 0}, 25, "auto", 174.0, 190, 25, simulated=("zz_part",)))
    first, second = (c.args[0] for c in repo.db.collection.return_value.add.call_args_list)
    assert "simulated" not in first and second["simulated"] == ["zz_part"]

"""The Firestore adapter bounds every call (each attempt and all retries together), so a stalled network
call cannot hold the scan lock, and Scan Now, for long. Uses a mock client: no real Firebase."""

from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest

from app.alerts import AlertPlan, NewAlert
from app.core.exceptions import StorageError
from app.firebase_db import ATTEMPT_SECONDS, TOTAL_SECONDS, ScanRepository, UserRepository, make_retry
from app.orders import NewOrder, OrderPlan
from app.scan_records import AutoScanState, ScanRecord, ScanStatus

T0 = datetime(2026, 11, 5, 9, 0, tzinfo=UTC)


@pytest.fixture
def repo():
    r = ScanRepository.__new__(ScanRepository)  # skip firestore.client()
    r.db = MagicMock()
    return r


def bounds(mock):
    return [(c.kwargs["timeout"], c.kwargs["retry"]) for c in mock.mock_calls if "timeout" in c.kwargs]


def test_every_read_and_write_has_an_attempt_limit_and_a_total_limit(repo):
    repo.save_scan(ScanRecord({"spark_plug": 4}, 25, "auto", 174.0, 1250, 25))
    repo.record_status(ScanStatus("auto", "counted", AutoScanState(True, 30), counts={"spark_plug": 4}))
    repo.record_scanning_settings(AutoScanState(True, 30))
    repo.get_products()
    repo.save_product_statuses({"spark_plug": "Matched"})
    repo.get_active_alerts()
    repo.apply_alert_plan(
        AlertPlan(create=(NewAlert("spark_plug", 3, 4),), mismatch_since={"spark_plug": T0})
    )
    repo.get_open_orders()
    repo.apply_order_plan(
        OrderPlan(create=(NewOrder("spark_plug", 1, "Spark Plug"),), streaks={"spark_plug": 0})
    )
    found = bounds(repo.db)
    assert len(found) == 9
    assert all(timeout == ATTEMPT_SECONDS and retry.timeout == TOTAL_SECONDS for timeout, retry in found)


def test_the_retry_policy_really_gives_up_at_its_total_limit():
    # against the real google.api_core retry code: an always-unavailable call stops at the limit, not 300 s
    import time

    from google.api_core.exceptions import RetryError, ServiceUnavailable

    calls = []

    def unavailable():
        calls.append(time.monotonic())
        raise ServiceUnavailable("network down")

    started = time.monotonic()
    with pytest.raises(RetryError):
        make_retry(total_seconds=0.6)(unavailable)()
    assert time.monotonic() - started < 1.5
    assert len(calls) >= 2  # it did retry, within the limit


def test_a_permanent_error_is_not_retried():
    from google.api_core.exceptions import PermissionDenied

    calls = []

    def denied():
        calls.append(1)
        raise PermissionDenied("no")

    with pytest.raises(PermissionDenied):
        make_retry(total_seconds=5)(denied)()
    assert calls == [1]


def test_a_timeout_becomes_a_storage_error(repo):
    repo.db.collection.return_value.stream.side_effect = TimeoutError("deadline exceeded")
    with pytest.raises(StorageError):
        repo.get_products()


def test_a_skipped_attempt_keeps_the_last_counts(repo):
    repo.record_status(
        ScanStatus("auto", "skipped", AutoScanState(True, 30), brightness=12.0, skip_reason="too_dark")
    )
    data = repo.db.collection.return_value.document.return_value.set.call_args
    assert "counts" not in data.args[0] and "counts" not in data.kwargs["merge"]
    assert data.args[0]["skipReason"] == "too_dark" and data.args[0]["lastOutcome"] == "skipped"


def test_a_counted_scan_replaces_the_counts_whole_so_no_old_part_lingers(repo):
    # merge=True would keep a key from an earlier scan (seen live: a simulated part stayed on the dashboard)
    repo.record_status(ScanStatus("auto", "counted", AutoScanState(True, 30), counts={"spark_plug": 4}))
    data = repo.db.collection.return_value.document.return_value.set.call_args
    assert data.args[0]["counts"] == {"spark_plug": 4}
    assert data.kwargs["merge"] == list(data.args[0]) and "counts" in data.kwargs["merge"]


def test_the_scanning_settings_are_written_alone_so_no_attempt_is_claimed(repo):
    repo.record_scanning_settings(AutoScanState(False, 30))
    data = repo.db.collection.return_value.document.return_value.set.call_args
    assert data.args[0] == {"autoScan": {"enabled": False, "intervalSeconds": 30}}
    assert data.kwargs["merge"] is True  # the last counts, attempt time and outcome stay as they were


def test_a_failed_settings_write_becomes_a_storage_error(repo):
    repo.db.collection.return_value.document.return_value.set.side_effect = TimeoutError("deadline exceeded")
    with pytest.raises(StorageError):
        repo.record_scanning_settings(AutoScanState(True, 30))


def test_a_new_order_stores_the_part_name(repo):
    repo.apply_order_plan(OrderPlan(create=(NewOrder("spark_plug", 2, "Spark Plug"),)))
    data = repo.db.batch.return_value.set.call_args.args[1]
    fields = (data["product"], data["productName"], data["qty"], data["state"])
    assert fields == ("spark_plug", "Spark Plug", 2, "Pending")


def test_open_orders_leave_out_received_and_cancelled_ones(repo):
    repo.get_open_orders()
    where = repo.db.collection.return_value.where.call_args.kwargs["filter"]
    assert sorted(where.value) == ["Accepted", "Dispatched", "Pending"]


def test_the_product_name_is_read_when_it_is_text(repo):
    doc = MagicMock(id="spark_plug")
    doc.to_dict.return_value = {"posCount": 4, "name": "Spark Plug"}
    other = MagicMock(id="petrol_filter")
    other.to_dict.return_value = {"posCount": 1, "name": 7}
    repo.db.collection.return_value.stream.return_value = [doc, other]
    products = repo.get_products()
    assert (products["spark_plug"].name, products["petrol_filter"].name) == ("Spark Plug", None)


def test_the_role_is_read_from_the_profile_with_the_same_limits():
    users = UserRepository.__new__(UserRepository)
    users.db = MagicMock()
    snap = users.db.collection.return_value.document.return_value.get.return_value
    snap.exists = True
    snap.to_dict.return_value = {"role": "dealer", "name": "Test Dealer"}
    assert users.get_role("u1") == "dealer"
    users.db.collection.assert_called_with("users")
    call = users.db.collection.return_value.document.return_value.get.call_args
    assert call.kwargs["timeout"] == ATTEMPT_SECONDS and call.kwargs["retry"].timeout == TOTAL_SECONDS
    snap.to_dict.return_value = {"role": 3}
    assert users.get_role("u1") is None
    snap.exists = False
    assert users.get_role("u1") is None
    users.db.collection.return_value.document.return_value.get.side_effect = TimeoutError()
    with pytest.raises(StorageError):
        users.get_role("u1")


def test_timers_are_written_and_cleared_on_the_product(repo):
    from firebase_admin import firestore

    repo.apply_alert_plan(AlertPlan(mismatch_since={"spark_plug": T0, "petrol_filter": None}))
    updates = [c.args[1] for c in repo.db.batch.return_value.update.call_args_list]
    assert {"mismatchSince": T0} in updates and {"mismatchSince": firestore.DELETE_FIELD} in updates


def test_the_pause_setting_is_read_with_the_same_limits(repo):
    snap = repo.db.collection.return_value.document.return_value.get.return_value
    snap.exists = True
    snap.to_dict.return_value = {"pausedUntil": T0}
    assert repo.get_paused_until() == T0
    call = repo.db.collection.return_value.document.return_value.get.call_args
    assert call.kwargs["timeout"] == ATTEMPT_SECONDS and call.kwargs["retry"].timeout == TOTAL_SECONDS
    snap.to_dict.return_value = {"pausedUntil": None}
    assert repo.get_paused_until() is None
    snap.exists = False
    assert repo.get_paused_until() is None

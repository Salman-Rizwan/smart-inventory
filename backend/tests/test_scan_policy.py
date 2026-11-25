from datetime import UTC, datetime, timedelta

import pytest

from app.scan_policy import AUTO, MANUAL, SaveDecision, should_save_scan

T0 = datetime(2026, 11, 5, 9, 0, tzinfo=UTC)
COUNTS = {"spark_plug": 4, "petrol_filter": 1}
HEARTBEAT = 600


def decide(trigger=AUTO, counts=COUNTS, last=COUNTS, saved_at=T0, after=60):
    return should_save_scan(trigger, counts, last, saved_at, T0 + timedelta(seconds=after), HEARTBEAT)


def test_a_manual_scan_is_always_saved_even_when_nothing_changed():
    assert decide(trigger=MANUAL, after=1) == SaveDecision(save=True)


def test_the_first_automatic_scan_after_a_restart_is_saved():
    assert decide(last=None, saved_at=None) == SaveDecision(save=True)


def test_unchanged_counts_before_the_heartbeat_are_not_saved():
    assert decide(after=HEARTBEAT - 1) == SaveDecision(save=False)


def test_unchanged_counts_at_exactly_the_heartbeat_are_saved_as_a_heartbeat():
    assert decide(after=HEARTBEAT) == SaveDecision(save=True, heartbeat=True)


@pytest.mark.parametrize(
    "counts",
    [
        {"spark_plug": 3, "petrol_filter": 1},  # a count changed
        {"spark_plug": 4},  # a part is no longer reported
        {"spark_plug": 4, "petrol_filter": 1, "brake_pad": 2},  # a new part
    ],
)
def test_any_change_in_the_counts_is_saved_at_once(counts):
    assert decide(counts=counts, after=1) == SaveDecision(save=True)

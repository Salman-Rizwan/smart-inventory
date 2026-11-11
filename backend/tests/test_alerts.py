from datetime import UTC, datetime, timedelta

import pytest

from app.alerts import ActiveAlert, AlertCountUpdate, NewAlert, plan_alerts
from app.reconcile import MATCHED, MISMATCH, Reconciliation

T0 = datetime(2026, 11, 5, 9, 0, tzinfo=UTC)


def mismatch(visual, pos):
    return Reconciliation(visual, pos, MISMATCH)


def matched(n):
    return Reconciliation(n, n, MATCHED)


def alert(id, product="spark_plug", state="Open", visual=3, pos=4):
    return ActiveAlert(id, product, state, visual, pos)


def test_first_mismatch_creates_one_alert():
    plan = plan_alerts({"spark_plug": mismatch(3, 4)}, [], now=T0)
    assert plan.create == (NewAlert("spark_plug", 3, 4),)
    assert plan.update == () and plan.resolve == ()


def test_matched_part_with_no_alert_does_nothing():
    assert plan_alerts({"spark_plug": matched(4)}, [], now=T0).is_empty


def test_repeated_mismatch_with_same_counts_changes_nothing():
    assert plan_alerts({"spark_plug": mismatch(3, 4)}, [alert("a1")], now=T0).is_empty


def test_repeated_mismatch_with_new_counts_refreshes_the_existing_alert():
    plan = plan_alerts({"spark_plug": mismatch(2, 4)}, [alert("a1")], now=T0)
    assert plan.create == ()
    assert plan.update == (AlertCountUpdate("a1", 2, 4),)


@pytest.mark.parametrize("state", ["Open", "Acknowledged"])
def test_matching_again_resolves_the_alert_whatever_its_state(state):
    plan = plan_alerts({"spark_plug": matched(4)}, [alert("a1", state=state)], now=T0)
    assert plan.resolve == ("a1",)
    assert plan.create == ()


def test_an_acknowledged_alert_is_not_duplicated_while_still_mismatched():
    assert plan_alerts({"spark_plug": mismatch(3, 4)}, [alert("a1", state="Acknowledged")], now=T0).is_empty


def test_duplicates_are_cleaned_up_keeping_the_oldest():
    plan = plan_alerts({"spark_plug": mismatch(3, 4)}, [alert("a1"), alert("a2"), alert("a3")], now=T0)
    assert plan.resolve == ("a2", "a3")
    assert plan.create == () and plan.update == ()


def test_each_part_is_handled_independently():
    plan = plan_alerts(
        {"spark_plug": matched(4), "petrol_filter": mismatch(0, 1)},
        [alert("a1", product="spark_plug")],
        now=T0,
    )
    assert plan.resolve == ("a1",)
    assert plan.create == (NewAlert("petrol_filter", 0, 1),)


def test_parts_missing_from_the_results_are_left_alone():
    # no POS record this scan: the existing alert must neither resolve nor change
    assert plan_alerts({"petrol_filter": matched(1)}, [alert("a1", product="spark_plug")], now=T0).is_empty


def test_nothing_to_do():
    assert plan_alerts({}, [], now=T0).is_empty


# --- alert delay (M6): a mismatch must last ALERT_DELAY_SECONDS before an alert opens ---

DELAY = 180


def later(seconds):
    return T0 + timedelta(seconds=seconds)


def delayed(results, active=(), since=None, at=T0):
    return plan_alerts(results, list(active), now=at, delay_seconds=DELAY, mismatch_since=since or {})


def test_a_first_mismatch_starts_the_timer_and_raises_nothing():
    plan = delayed({"spark_plug": mismatch(3, 4)})
    assert plan.create == ()
    assert plan.mismatch_since == {"spark_plug": T0}


def test_still_under_the_delay_raises_nothing_and_writes_nothing():
    assert delayed({"spark_plug": mismatch(3, 4)}, since={"spark_plug": T0}, at=later(DELAY - 1)).is_empty


def test_at_exactly_the_delay_the_alert_opens_with_the_current_counts():
    plan = delayed({"spark_plug": mismatch(2, 4)}, since={"spark_plug": T0}, at=later(DELAY))
    assert plan.create == (NewAlert("spark_plug", 2, 4),)
    assert plan.mismatch_since == {}  # the timer keeps running until the counts match


def test_a_delay_of_zero_alerts_at_once_as_before():
    plan = plan_alerts({"spark_plug": mismatch(3, 4)}, [], now=T0, delay_seconds=0)
    assert plan.create == (NewAlert("spark_plug", 3, 4),)


def test_a_match_before_the_delay_clears_the_timer_and_raises_nothing():
    plan = delayed({"spark_plug": matched(4)}, since={"spark_plug": T0}, at=later(60))
    assert plan.create == () and plan.resolve == ()
    assert plan.mismatch_since == {"spark_plug": None}


def test_a_match_resolves_an_active_alert_at_once_and_clears_the_timer():
    plan = delayed({"spark_plug": matched(4)}, [alert("a1")], since={"spark_plug": T0}, at=later(1))
    assert plan.resolve == ("a1",)
    assert plan.mismatch_since == {"spark_plug": None}


def test_counts_changing_while_still_mismatched_keep_the_original_start():
    plan = delayed({"spark_plug": mismatch(2, 4)}, since={"spark_plug": T0}, at=later(90))
    assert plan.is_empty  # still the same mismatch: 90 s in, not 0


def test_mismatch_match_mismatch_restarts_the_timer():
    first = delayed({"spark_plug": matched(4)}, since={"spark_plug": T0}, at=later(100))
    assert first.mismatch_since == {"spark_plug": None}
    again = delayed({"spark_plug": mismatch(3, 4)}, since={}, at=later(130))
    assert again.mismatch_since == {"spark_plug": later(130)} and again.create == ()


def test_an_acknowledged_alert_stays_acknowledged_and_no_second_alert_opens():
    plan = delayed(
        {"spark_plug": mismatch(3, 4)},
        [alert("a1", state="Acknowledged")],
        since={"spark_plug": T0},
        at=later(DELAY * 3),
    )
    assert plan.is_empty


def test_an_active_alert_is_refreshed_only_when_its_counts_change():
    assert delayed({"spark_plug": mismatch(3, 4)}, [alert("a1")], at=later(DELAY)).is_empty
    plan = delayed({"spark_plug": mismatch(1, 4)}, [alert("a1")], at=later(DELAY))
    assert plan.update == (AlertCountUpdate("a1", 1, 4),)


def test_a_part_without_a_pos_record_is_left_alone():
    assert delayed({}, [alert("a1")], since={"spark_plug": T0}, at=later(DELAY)).is_empty


@pytest.mark.parametrize(
    "bad", ["2026-11-05", 12345, datetime(2026, 11, 5, 9, 0)]
)  # text, number, no timezone
def test_a_malformed_start_time_is_replaced_by_now(bad):
    plan = delayed({"spark_plug": mismatch(3, 4)}, since={"spark_plug": bad}, at=later(DELAY))
    assert plan.mismatch_since == {"spark_plug": later(DELAY)}
    assert plan.create == ()  # it starts counting from now, never from a guess


def test_a_start_time_in_the_future_counts_as_now():
    plan = delayed({"spark_plug": mismatch(3, 4)}, since={"spark_plug": later(3600)}, at=T0)
    assert plan.mismatch_since == {"spark_plug": T0} and plan.create == ()


def test_a_malformed_start_time_is_cleared_when_the_counts_match():
    assert delayed({"spark_plug": matched(4)}, since={"spark_plug": "junk"}).mismatch_since == {
        "spark_plug": None
    }


def test_each_part_has_its_own_timer():
    plan = delayed(
        {"spark_plug": mismatch(3, 4), "petrol_filter": mismatch(0, 1)},
        since={"spark_plug": T0},
        at=later(DELAY),
    )
    assert plan.create == (NewAlert("spark_plug", 3, 4),)
    assert plan.mismatch_since == {"petrol_filter": later(DELAY)}


def test_after_a_gap_a_stored_start_time_is_not_trusted():
    # found live on Nov 5: a timer left from the day before opened an alert on the first mismatched scan
    yesterday = T0 - timedelta(hours=21)
    plan = plan_alerts(
        {"spark_plug": mismatch(0, 4)},
        [],
        now=T0,
        delay_seconds=DELAY,
        mismatch_since={"spark_plug": yesterday},
        restart_timers=True,
    )
    assert plan.create == () and plan.mismatch_since == {"spark_plug": T0}


def test_after_a_gap_a_match_still_clears_an_old_timer():
    plan = plan_alerts(
        {"spark_plug": matched(4)},
        [],
        now=T0,
        delay_seconds=DELAY,
        mismatch_since={"spark_plug": T0},
        restart_timers=True,
    )
    assert plan.mismatch_since == {"spark_plug": None}

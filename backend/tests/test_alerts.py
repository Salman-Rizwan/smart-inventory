import pytest

from app.alerts import ActiveAlert, AlertCountUpdate, NewAlert, plan_alerts
from app.reconcile import MATCHED, MISMATCH, Reconciliation


def mismatch(visual, pos):
    return Reconciliation(visual, pos, MISMATCH)


def matched(n):
    return Reconciliation(n, n, MATCHED)


def alert(id, product="spark_plug", state="Open", visual=3, pos=4):
    return ActiveAlert(id, product, state, visual, pos)


def test_first_mismatch_creates_one_alert():
    plan = plan_alerts({"spark_plug": mismatch(3, 4)}, [])
    assert plan.create == (NewAlert("spark_plug", 3, 4),)
    assert plan.update == () and plan.resolve == ()


def test_matched_part_with_no_alert_does_nothing():
    assert plan_alerts({"spark_plug": matched(4)}, []).is_empty


def test_repeated_mismatch_with_same_counts_changes_nothing():
    assert plan_alerts({"spark_plug": mismatch(3, 4)}, [alert("a1")]).is_empty


def test_repeated_mismatch_with_new_counts_refreshes_the_existing_alert():
    plan = plan_alerts({"spark_plug": mismatch(2, 4)}, [alert("a1")])
    assert plan.create == ()
    assert plan.update == (AlertCountUpdate("a1", 2, 4),)


@pytest.mark.parametrize("state", ["Open", "Acknowledged"])
def test_matching_again_resolves_the_alert_whatever_its_state(state):
    plan = plan_alerts({"spark_plug": matched(4)}, [alert("a1", state=state)])
    assert plan.resolve == ("a1",)
    assert plan.create == ()


def test_an_acknowledged_alert_is_not_duplicated_while_still_mismatched():
    assert plan_alerts({"spark_plug": mismatch(3, 4)}, [alert("a1", state="Acknowledged")]).is_empty


def test_duplicates_are_cleaned_up_keeping_the_oldest():
    plan = plan_alerts({"spark_plug": mismatch(3, 4)}, [alert("a1"), alert("a2"), alert("a3")])
    assert plan.resolve == ("a2", "a3")
    assert plan.create == () and plan.update == ()


def test_each_part_is_handled_independently():
    plan = plan_alerts(
        {"spark_plug": matched(4), "petrol_filter": mismatch(0, 1)},
        [alert("a1", product="spark_plug")],
    )
    assert plan.resolve == ("a1",)
    assert plan.create == (NewAlert("petrol_filter", 0, 1),)


def test_parts_missing_from_the_results_are_left_alone():
    # no POS record this scan: the existing alert must neither resolve nor change
    assert plan_alerts({"petrol_filter": matched(1)}, [alert("a1", product="spark_plug")]).is_empty


def test_nothing_to_do():
    assert plan_alerts({}, []).is_empty

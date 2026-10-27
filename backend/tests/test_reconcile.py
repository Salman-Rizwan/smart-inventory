import pytest

from app.reconcile import MATCHED, MISMATCH, Reconciliation, reconcile, status_for


@pytest.mark.parametrize(
    "visual,pos,expected",
    [(3, 3, MATCHED), (0, 0, MATCHED), (4, 3, MISMATCH), (2, 3, MISMATCH), (0, 1, MISMATCH)],
)
def test_status_for(visual, pos, expected):
    assert status_for(visual, pos) == expected


def test_difference_is_shelf_minus_pos():
    assert Reconciliation(visual=4, pos=3, status=MISMATCH).difference == 1
    assert Reconciliation(visual=2, pos=3, status=MISMATCH).difference == -1


def test_reconcile_compares_each_part():
    result = reconcile({"spark_plug": 4, "petrol_filter": 1}, {"spark_plug": 3, "petrol_filter": 1})
    assert result["spark_plug"] == Reconciliation(4, 3, MISMATCH)
    assert result["petrol_filter"] == Reconciliation(1, 1, MATCHED)


def test_reconcile_skips_parts_without_a_pos_record():
    assert reconcile({"spark_plug": 3, "brake_pad": 2}, {"spark_plug": 3}).keys() == {"spark_plug"}


def test_reconcile_ignores_products_the_model_did_not_report():
    assert reconcile({"spark_plug": 3}, {"spark_plug": 3, "retired_part": 9}).keys() == {"spark_plug"}


def test_reconcile_with_nothing_to_compare():
    assert reconcile({}, {"spark_plug": 3}) == {}
    assert reconcile({"spark_plug": 3}, {}) == {}

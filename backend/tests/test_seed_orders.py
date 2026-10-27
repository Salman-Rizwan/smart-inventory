from datetime import UTC, datetime

import pytest

from scripts.seed_orders import STATES, build_orders

NOW = datetime(2026, 10, 27, 12, 0, tzinfo=UTC)


def test_builds_one_order_per_state():
    orders = build_orders({"spark_plug": 10, "petrol_filter": 6}, NOW)
    assert [o["state"] for o in orders.values()] == list(STATES)


def test_every_order_is_marked_seeded_and_uses_a_real_product_and_its_reorder_quantity():
    orders = build_orders({"spark_plug": 10, "petrol_filter": 6}, NOW)
    for order in orders.values():
        assert order["seeded"] is True
        assert order["product"] in {"spark_plug", "petrol_filter"}
        assert order["qty"] == {"spark_plug": 10, "petrol_filter": 6}[order["product"]]


def test_each_order_carries_a_timestamp_for_every_step_it_has_passed():
    by_state = {o["state"]: o for o in build_orders({"spark_plug": 10}, NOW).values()}
    assert {"acceptedAt", "dispatchedAt", "receivedAt"}.isdisjoint(by_state["Pending"])
    assert "acceptedAt" in by_state["Accepted"] and "dispatchedAt" not in by_state["Accepted"]
    assert "dispatchedAt" in by_state["Dispatched"] and "receivedAt" not in by_state["Dispatched"]
    assert {"acceptedAt", "dispatchedAt", "receivedAt"} <= set(by_state["Received"])


def test_steps_happen_in_order_after_the_order_was_raised():
    received = build_orders({"spark_plug": 10}, NOW)["seed-4-received"]
    assert received["createdAt"] < received["acceptedAt"] < received["dispatchedAt"] < received["receivedAt"]


def test_ids_are_stable_so_rerunning_resets_instead_of_duplicating():
    assert build_orders({"spark_plug": 10}, NOW).keys() == build_orders({"spark_plug": 10}, NOW).keys()


def test_a_single_product_still_works():
    assert {o["product"] for o in build_orders({"spark_plug": 10}, NOW).values()} == {"spark_plug"}


def test_no_products_is_a_clear_error():
    with pytest.raises(ValueError, match="seed_products"):
        build_orders({}, NOW)

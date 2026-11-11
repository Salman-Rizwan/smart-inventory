from datetime import UTC, datetime, timedelta

import pytest

from scripts.seed_history import BY, PREFIX, Part, plan_history, replay, summarise

NOW = datetime(2026, 11, 12, 6, 30, tzinfo=UTC)  # 12:00 in Colombo
PLUG = Part("spark_plug", "Spark Plug", pos_count=4, reorder_level=2, unit_cost=350, unit_price=500)
FILTER = Part("petrol_filter", "Petrol Filter", pos_count=1, reorder_level=0, unit_cost=900, unit_price=1200)
PARTS = [PLUG, FILTER]


@pytest.fixture(scope="module")
def history():
    return plan_history(PARTS, NOW)


def entries_of(history, part_id):
    return sorted((m for m in history.movements.values() if m["product"] == part_id), key=lambda m: m["at"])


def test_each_chain_replays_exactly_to_the_real_pos_count(history):
    assert replay(history, "spark_plug") == 4
    assert replay(history, "petrol_filter") == 1


def test_no_count_is_ever_negative_and_entries_join_up(history):
    for part in PARTS:
        previous = None
        for entry in entries_of(history, part.id):
            assert entry["posBefore"] >= 0 and entry["posAfter"] >= 0
            assert entry["posAfter"] == entry["posBefore"] + entry["change"]
            if previous is not None:
                assert entry["posBefore"] == previous["posAfter"]
            previous = entry


def test_the_history_covers_the_period_with_no_future_dates(history):
    times = [m["at"] for m in history.movements.values()]
    times += [o[k] for o in history.orders.values() for k in ("acceptedAt", "dispatchedAt", "receivedAt")]
    times += [a["createdAt"] for a in history.alerts.values()] + [
        a["resolvedAt"] for a in history.alerts.values()
    ]
    assert max(times) < NOW
    assert min(m["at"] for m in history.movements.values()) > NOW - timedelta(days=31)
    assert min(m["at"] for m in history.movements.values()) < NOW - timedelta(days=25)


def test_every_document_is_marked_as_demo_data(history):
    for doc_id, movement in history.movements.items():
        assert doc_id.startswith(PREFIX) and movement["seeded"] is True and movement["by"] == BY
    for doc_id, order in history.orders.items():
        assert doc_id.startswith(PREFIX) and order["seeded"] is True
    for doc_id, alert in history.alerts.items():
        assert doc_id.startswith(PREFIX) and alert["seeded"] is True


def test_reasons_match_the_direction_of_the_change(history):
    for movement in history.movements.values():
        if movement["type"] == "Sale":
            assert movement["change"] == -1 and "reason" not in movement
        elif movement["type"] == "Adjustment":
            assert movement["reason"] in {"Damaged", "LostOrStolen", "CustomerReturn"}
            assert (movement["change"] > 0) == (movement["reason"] == "CustomerReturn")
        elif movement["type"] == "OrderReceived":
            assert movement["change"] == 10 and movement["orderId"] in history.orders
        else:
            pytest.fail(f"unexpected type {movement['type']}")


def test_every_order_is_received_with_every_stage_in_order_and_matches_its_delivery(history):
    assert history.orders, "a month of sales needs at least one delivery"
    for order_id, order in history.orders.items():
        assert order["state"] == "Received" and order["source"] == "auto" and order["receivedBy"] == BY
        assert order["createdAt"] < order["acceptedAt"] < order["dispatchedAt"] < order["receivedAt"]
        assert order["productName"] in {"Spark Plug", "Petrol Filter"}
        lead = order["receivedAt"] - order["createdAt"]
        assert timedelta(days=2) <= lead <= timedelta(days=4)
        delivery = next(m for m in history.movements.values() if m.get("orderId") == order_id)
        assert delivery["at"] == order["receivedAt"] and delivery["change"] == order["qty"]


def test_deliveries_arrive_when_the_stock_had_run_low(history):
    for movement in history.movements.values():
        if movement["type"] == "OrderReceived":
            assert movement["posBefore"] <= 2


def test_sales_happen_in_shop_hours_in_colombo(history):
    for movement in history.movements.values():
        if movement["type"] == "Sale":
            local = movement["at"] + timedelta(hours=5, minutes=30)
            assert 9 <= local.hour < 18


def test_sales_volume_is_plausible_for_a_month(history):
    plug_sales = sum(1 for m in entries_of(history, "spark_plug") if m["type"] == "Sale")
    filter_sales = sum(1 for m in entries_of(history, "petrol_filter") if m["type"] == "Sale")
    assert 20 <= plug_sales <= 45
    assert 5 <= filter_sales <= 18


def test_every_entry_carries_the_part_cost_and_price(history):
    for movement in history.movements.values():
        part = PLUG if movement["product"] == "spark_plug" else FILTER
        assert movement["unitCost"] == part.unit_cost and movement["unitPrice"] == part.unit_price


def test_alerts_are_resolved_mismatches_at_the_count_of_that_moment(history):
    assert len(history.alerts) == 6
    for alert in history.alerts.values():
        assert alert["state"] == "Resolved" and alert["visualCount"] != alert["posCount"]
        assert alert["createdAt"] < alert["resolvedAt"]
        if "acknowledgedAt" in alert:
            assert alert["createdAt"] < alert["acknowledgedAt"] < alert["resolvedAt"]


def test_last_movement_names_the_newest_entry_of_each_part(history):
    for part in PARTS:
        newest = entries_of(history, part.id)[-1]
        assert history.movements[history.last_movement[part.id]] is newest


def test_the_same_inputs_give_the_same_history():
    first, second = plan_history(PARTS, NOW), plan_history(PARTS, NOW)
    assert (
        first.movements == second.movements
        and first.orders == second.orders
        and first.alerts == second.alerts
    )
    assert plan_history(PARTS, NOW, seed=2).movements != first.movements


def test_too_short_a_period_is_refused():
    with pytest.raises(ValueError):
        plan_history(PARTS, NOW, days=7)


def test_replay_reports_a_broken_chain():
    history = plan_history(PARTS, NOW)
    first = entries_of(history, "spark_plug")[0]
    first["posAfter"] += 1
    with pytest.raises(ValueError):
        replay(history, "spark_plug")


def test_the_summary_names_each_part_and_its_counts(history):
    text = summarise(history, PARTS)
    assert "spark_plug:" in text and "-> 4 (now 4)" in text
    assert "petrol_filter:" in text and "-> 1 (now 1)" in text
    assert "Received" in text and "Resolved" in text

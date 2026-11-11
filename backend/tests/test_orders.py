from datetime import UTC, datetime, timedelta

from app.orders import ActiveOrder, NewOrder, plan_orders
from app.products import ProductRecord

T0 = datetime(2026, 11, 5, 9, 0, tzinfo=UTC)


def product(level=2, qty=10, streak=0, pos=4, low_since=None):
    return ProductRecord(
        pos_count=pos, reorder_level=level, reorder_qty=qty, low_streak=streak, low_since=low_since
    )


def order(product_id="spark_plug", state="Pending", id="o1"):
    return ActiveOrder(id, product_id, state)


def test_a_part_above_its_reorder_level_does_nothing():
    assert plan_orders({"spark_plug": 3}, {"spark_plug": product(level=2)}, [], 2, now=T0).is_empty


def test_the_first_low_scan_only_starts_the_count():
    plan = plan_orders({"spark_plug": 2}, {"spark_plug": product(level=2)}, [], 2, now=T0)
    assert plan.create == ()
    assert plan.streaks == {"spark_plug": 1}


def test_the_second_low_scan_in_a_row_raises_one_order_and_resets_the_count():
    plan = plan_orders({"spark_plug": 1}, {"spark_plug": product(level=2, qty=12, streak=1)}, [], 2, now=T0)
    assert plan.create == (NewOrder("spark_plug", 12),)
    assert plan.streaks == {"spark_plug": 0}


def test_the_level_itself_counts_as_low():
    assert plan_orders({"spark_plug": 2}, {"spark_plug": product(level=2, streak=1)}, [], 2, now=T0).create


def test_recovering_above_the_level_resets_the_count_so_one_glitch_never_orders():
    plan = plan_orders({"spark_plug": 4}, {"spark_plug": product(level=2, streak=1)}, [], 2, now=T0)
    assert plan.create == ()
    assert plan.streaks == {"spark_plug": 0}


def test_confirming_after_one_scan_orders_immediately():
    assert plan_orders({"spark_plug": 0}, {"spark_plug": product(level=2)}, [], 1, now=T0).create


def test_a_longer_confirmation_window_waits_longer():
    plan = plan_orders({"spark_plug": 0}, {"spark_plug": product(level=2, streak=1)}, [], 3, now=T0)
    assert plan.create == () and plan.streaks == {"spark_plug": 2}


def test_a_part_that_can_never_order_tracks_nothing_and_stops_writing():
    # automatic orders off (no quantity): an old streak is cleared once, then nothing is written per scan
    plan = plan_orders({"spark_plug": 0}, {"spark_plug": product(level=2, qty=0, streak=2)}, [], 2, now=T0)
    assert plan.streaks == {"spark_plug": 0} and plan.low_since == {} and plan.create == ()
    assert plan_orders({"spark_plug": 0}, {"spark_plug": product(level=2, qty=0)}, [], 2, now=T0).is_empty


def test_a_product_with_no_reorder_quantity_never_orders():
    assert (
        plan_orders(
            {"spark_plug": 0}, {"spark_plug": product(level=2, qty=0, streak=5)}, [], 2, now=T0
        ).create
        == ()
    )


def test_the_same_part_never_gets_a_second_order_while_one_is_open():
    for state in ("Pending", "Accepted", "Dispatched"):
        plan = plan_orders(
            {"spark_plug": 0}, {"spark_plug": product(level=2, streak=1)}, [order(state=state)], 2, now=T0
        )
        assert plan.create == (), state
        assert plan.streaks == {"spark_plug": 0}


def test_a_received_order_is_not_open_so_the_part_can_be_ordered_again():
    # the repository only returns open orders, so a received one simply is not in the list
    assert plan_orders({"spark_plug": 0}, {"spark_plug": product(level=2, streak=1)}, [], 2, now=T0).create


def test_an_open_order_for_another_part_does_not_block_this_one():
    plan = plan_orders(
        {"spark_plug": 0, "petrol_filter": 0},
        {"spark_plug": product(level=2, streak=1), "petrol_filter": product(level=2, streak=1)},
        [order("petrol_filter")],
        2,
        now=T0,
    )
    assert plan.create == (NewOrder("spark_plug", 10),)


def test_each_part_is_handled_independently():
    plan = plan_orders(
        {"spark_plug": 5, "petrol_filter": 0},
        {"spark_plug": product(level=2), "petrol_filter": product(level=2)},
        [],
        2,
        now=T0,
    )
    assert plan.create == ()
    assert plan.streaks == {"petrol_filter": 1}


def test_parts_without_a_product_record_are_ignored():
    assert plan_orders({"brake_pad": 0}, {}, [], 2, now=T0).is_empty


def test_nothing_counted_nothing_to_do():
    assert plan_orders({}, {"spark_plug": product()}, [], 2, now=T0).is_empty


# --- reorder delay (M6): low must last REORDER_DELAY_SECONDS as well as the low-scan streak ---

DELAY = 300


def later(seconds):
    return T0 + timedelta(seconds=seconds)


def delayed(count, prod, open_orders=(), at=T0, confirm=2):
    return plan_orders(
        {"spark_plug": count}, {"spark_plug": prod}, list(open_orders), confirm, now=at, delay_seconds=DELAY
    )


def test_going_low_starts_the_timer_and_the_streak():
    plan = delayed(2, product(level=2))
    assert plan.create == () and plan.streaks == {"spark_plug": 1} and plan.low_since == {"spark_plug": T0}


def test_the_streak_alone_does_not_order_before_the_delay():
    plan = delayed(1, product(level=2, streak=1, low_since=T0), at=later(60))
    assert plan.create == ()
    assert plan.streaks == {"spark_plug": 2} and plan.low_since == {}  # the start time is kept, not rewritten


def test_waiting_with_the_streak_already_met_writes_nothing():
    assert delayed(1, product(level=2, streak=2, low_since=T0), at=later(DELAY - 1)).is_empty


def test_streak_and_delay_both_met_order_once_and_reset_both():
    plan = delayed(1, product(level=2, qty=12, streak=2, low_since=T0), at=later(DELAY))
    assert plan.create == (NewOrder("spark_plug", 12),)
    assert plan.streaks == {"spark_plug": 0} and plan.low_since == {"spark_plug": None}


def test_the_delay_alone_does_not_order_without_the_streak():
    # one scan after a long gap (laptop was off): still needs a second low scan
    plan = delayed(1, product(level=2, streak=0, low_since=T0), at=later(DELAY * 5), confirm=2)
    assert plan.create == () and plan.streaks == {"spark_plug": 1}


def test_a_delay_of_zero_and_two_scans_order_as_before_for_the_demo():
    first = plan_orders({"spark_plug": 1}, {"spark_plug": product(level=2)}, [], 2, now=T0, delay_seconds=0)
    assert first.create == ()
    second = plan_orders(
        {"spark_plug": 1},
        {"spark_plug": product(level=2, streak=1, low_since=T0)},
        [],
        2,
        now=later(5),
        delay_seconds=0,
    )
    assert second.create == (NewOrder("spark_plug", 10),)


def test_back_above_the_level_clears_the_streak_and_the_timer():
    plan = delayed(3, product(level=2, streak=2, low_since=T0), at=later(DELAY - 10))
    assert plan.streaks == {"spark_plug": 0} and plan.low_since == {"spark_plug": None} and plan.create == ()


def test_an_open_order_holds_both_cleared():
    plan = delayed(
        0, product(level=2, streak=2, low_since=T0), [order(state="Dispatched")], at=later(DELAY * 2)
    )
    assert plan.create == () and plan.streaks == {"spark_plug": 0} and plan.low_since == {"spark_plug": None}


def test_after_an_order_is_received_a_fresh_delay_is_needed():
    plan = delayed(0, product(level=2, streak=0, low_since=None), at=later(DELAY * 10))
    assert plan.create == () and plan.low_since == {"spark_plug": later(DELAY * 10)}


def test_level_zero_with_an_empty_shelf_is_low():
    assert delayed(0, product(level=0)).low_since == {"spark_plug": T0}


def test_a_future_or_malformed_start_time_counts_from_now():
    for bad in [later(3600), "2026-11-05", datetime(2026, 11, 5, 9, 0)]:
        plan = delayed(1, product(level=2, streak=2, low_since=bad), at=later(DELAY))
        assert plan.create == () and plan.low_since == {"spark_plug": later(DELAY)}


def test_after_a_gap_the_streak_and_the_timer_start_again():
    # low before the laptop slept and low again after: one scan, not an order (found live on Nov 5)
    prod = product(level=2, streak=2, low_since=T0 - timedelta(hours=4))
    plan = plan_orders(
        {"spark_plug": 1}, {"spark_plug": prod}, [], 2, now=T0, delay_seconds=DELAY, restart_timers=True
    )
    assert plan.create == ()
    assert plan.streaks == {"spark_plug": 1} and plan.low_since == {"spark_plug": T0}

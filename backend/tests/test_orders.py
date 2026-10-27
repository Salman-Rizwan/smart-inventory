from app.orders import ActiveOrder, NewOrder, plan_orders
from app.products import ProductRecord


def product(level=2, qty=10, streak=0, pos=4):
    return ProductRecord(pos_count=pos, reorder_level=level, reorder_qty=qty, low_streak=streak)


def order(product_id="spark_plug", state="Pending", id="o1"):
    return ActiveOrder(id, product_id, state)


def test_a_part_above_its_reorder_level_does_nothing():
    assert plan_orders({"spark_plug": 3}, {"spark_plug": product(level=2)}, [], 2).is_empty


def test_the_first_low_scan_only_starts_the_count():
    plan = plan_orders({"spark_plug": 2}, {"spark_plug": product(level=2)}, [], 2)
    assert plan.create == ()
    assert plan.streaks == {"spark_plug": 1}


def test_the_second_low_scan_in_a_row_raises_one_order_and_resets_the_count():
    plan = plan_orders({"spark_plug": 1}, {"spark_plug": product(level=2, qty=12, streak=1)}, [], 2)
    assert plan.create == (NewOrder("spark_plug", 12),)
    assert plan.streaks == {"spark_plug": 0}


def test_the_level_itself_counts_as_low():
    assert plan_orders({"spark_plug": 2}, {"spark_plug": product(level=2, streak=1)}, [], 2).create


def test_recovering_above_the_level_resets_the_count_so_one_glitch_never_orders():
    plan = plan_orders({"spark_plug": 4}, {"spark_plug": product(level=2, streak=1)}, [], 2)
    assert plan.create == ()
    assert plan.streaks == {"spark_plug": 0}


def test_confirming_after_one_scan_orders_immediately():
    assert plan_orders({"spark_plug": 0}, {"spark_plug": product(level=2)}, [], 1).create


def test_a_longer_confirmation_window_waits_longer():
    plan = plan_orders({"spark_plug": 0}, {"spark_plug": product(level=2, streak=1)}, [], 3)
    assert plan.create == () and plan.streaks == {"spark_plug": 2}


def test_the_count_stops_growing_once_it_reaches_the_window():
    # a part that can never order (no quantity) must not rewrite its streak on every scan
    plan = plan_orders({"spark_plug": 0}, {"spark_plug": product(level=2, qty=0, streak=2)}, [], 2)
    assert plan.is_empty


def test_a_product_with_no_reorder_quantity_never_orders():
    assert (
        plan_orders({"spark_plug": 0}, {"spark_plug": product(level=2, qty=0, streak=5)}, [], 2).create == ()
    )


def test_the_same_part_never_gets_a_second_order_while_one_is_open():
    for state in ("Pending", "Accepted", "Dispatched"):
        plan = plan_orders(
            {"spark_plug": 0}, {"spark_plug": product(level=2, streak=1)}, [order(state=state)], 2
        )
        assert plan.create == (), state
        assert plan.streaks == {"spark_plug": 0}


def test_a_received_order_is_not_open_so_the_part_can_be_ordered_again():
    # the repository only returns open orders, so a received one simply is not in the list
    assert plan_orders({"spark_plug": 0}, {"spark_plug": product(level=2, streak=1)}, [], 2).create


def test_an_open_order_for_another_part_does_not_block_this_one():
    plan = plan_orders(
        {"spark_plug": 0, "petrol_filter": 0},
        {"spark_plug": product(level=2, streak=1), "petrol_filter": product(level=2, streak=1)},
        [order("petrol_filter")],
        2,
    )
    assert plan.create == (NewOrder("spark_plug", 10),)


def test_each_part_is_handled_independently():
    plan = plan_orders(
        {"spark_plug": 5, "petrol_filter": 0},
        {"spark_plug": product(level=2), "petrol_filter": product(level=2)},
        [],
        2,
    )
    assert plan.create == ()
    assert plan.streaks == {"petrol_filter": 1}


def test_parts_without_a_product_record_are_ignored():
    assert plan_orders({"brake_pad": 0}, {}, [], 2).is_empty


def test_nothing_counted_nothing_to_do():
    assert plan_orders({}, {"spark_plug": product()}, [], 2).is_empty

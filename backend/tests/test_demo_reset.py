from scripts.demo_reset import DEMO_PRODUCTS, describe_change, plan_reset


def test_every_demo_product_gets_its_demo_values():
    existing = {"spark_plug": {"posCount": 9}, "petrol_filter": {"posCount": 0}}
    assert plan_reset(existing) == DEMO_PRODUCTS


def test_only_products_that_exist_are_touched():
    assert list(plan_reset({"spark_plug": {}})) == ["spark_plug"]


def test_an_unknown_class_is_left_alone():
    assert plan_reset({"brake_pad": {"posCount": 3}}) == {}


def test_the_plan_is_a_copy_so_the_demo_values_cannot_be_changed_by_accident():
    plan = plan_reset({"spark_plug": {}})
    plan["spark_plug"]["posCount"] = 99
    assert DEMO_PRODUCTS["spark_plug"]["posCount"] == 4


def test_the_demo_shelf_matches_the_pos_and_one_plug_removed_triggers_a_reorder():
    plug = DEMO_PRODUCTS["spark_plug"]
    assert plug["posCount"] == 4 and plug["reorderLevel"] == 3  # 3 plugs left is at the level
    assert DEMO_PRODUCTS["petrol_filter"]["reorderLevel"] == 0  # a filter on the shelf never reorders
    assert plug["reorderQty"] == 1  # one delivered plug puts the shelf and the POS back in step


def test_it_describes_only_what_would_change():
    text = describe_change(
        "spark_plug",
        {"posCount": 6, "reorderLevel": 3, "reorderQty": 10, "lowScanStreak": 1},
        DEMO_PRODUCTS["spark_plug"],
    )
    assert "posCount 6 -> 4" in text and "reorderQty 10 -> 1" in text and "lowScanStreak 1 -> 0" in text
    assert "reorderLevel" not in text


def test_it_says_so_when_nothing_changes():
    assert describe_change(
        "spark_plug", dict(DEMO_PRODUCTS["spark_plug"]), DEMO_PRODUCTS["spark_plug"]
    ).endswith("already as in the demo")

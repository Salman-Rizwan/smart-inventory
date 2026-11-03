from app.stock_log import RESET, reset_movement


def test_a_changed_count_is_logged_as_a_reset_with_the_part_cost_and_price():
    current = {"posCount": 6, "unitCost": 950, "unitPrice": 1250}
    assert reset_movement("spark_plug", current, 4, "demo_reset") == {
        "product": "spark_plug",
        "type": RESET,
        "change": -2,
        "posBefore": 6,
        "posAfter": 4,
        "unitCost": 950,
        "unitPrice": 1250,
        "by": "demo_reset",
    }


def test_an_unchanged_count_needs_no_entry():
    assert reset_movement("spark_plug", {"posCount": 4}, 4, "demo_reset") is None


def test_a_new_or_damaged_record_counts_from_zero_with_no_prices():
    entry = reset_movement("brake_pad", {}, 3, "seed_products")
    assert entry["posBefore"] == 0 and entry["change"] == 3
    assert entry["unitCost"] is None and entry["unitPrice"] is None
    assert reset_movement("brake_pad", {"posCount": "3"}, 3, "seed_products")["posBefore"] == 0
    assert reset_movement("brake_pad", {"posCount": True}, 1, "seed_products")["posBefore"] == 0

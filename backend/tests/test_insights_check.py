"""The check script's maths on a fixed history: the same cases the browser's analytics tests cover."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from scripts.insights_check import buckets, compute, ranking, recommendation, sales, sales_change, what_to_do

TZ = ZoneInfo("Asia/Colombo")
NOW = datetime(2026, 11, 12, 12, 0, tzinfo=TZ)


def at(days_ago: int) -> datetime:
    return NOW.replace(hour=10) - timedelta(days=days_ago)


def sale(days_ago, product="spark_plug", price=500, seeded=True):
    return {
        "product": product,
        "type": "Sale",
        "change": -1,
        "unitPrice": price,
        "unitCost": 350,
        "at": at(days_ago),
        "seeded": seeded,
    }


def adjustment(days_ago, reason, change=-1, product="spark_plug"):
    return {
        "product": product,
        "type": "Adjustment",
        "change": change,
        "reason": reason,
        "unitPrice": 500,
        "unitCost": 350,
        "at": at(days_ago),
    }


def order(days_ago, lead_days):
    return {
        "product": "spark_plug",
        "state": "Received",
        "createdAt": at(days_ago) - timedelta(days=lead_days),
        "receivedAt": at(days_ago),
    }


PRODUCTS = {
    "spark_plug": {"name": "Spark Plug", "reorderLevel": 2},
    "petrol_filter": {"name": "Petrol Filter", "reorderLevel": 0},
}
MOVEMENTS = (
    [sale(d) for d in range(1, 21)]
    + [sale(d) for d in range(31, 41)]
    + [adjustment(2, "CustomerReturn", 1), adjustment(4, "Damaged")]
)
MOVEMENTS += [
    sale(3, "petrol_filter", 1200),
    {"product": "petrol_filter", "type": "Receipt", "change": 10, "at": at(28), "seeded": False},
]
ORDERS = [order(25, 3), order(10, 2), order(50, 4)]


def test_the_report_matches_the_browser_definitions():
    report = compute(MOVEMENTS, ORDERS, PRODUCTS, {"spark_plug": 4, "petrol_filter": 1}, NOW, 30, None, TZ)
    assert report["sales"] == {
        "units": 20,
        "value": 10700.0,
        "unpriced": 0,
        "profit": 3700.0,
        "profitBase": 10700.0,
        "uncosted": 0,
    }
    assert report["change"] == {"kind": "change", "percent": 114}
    assert report["profitChange"] == {"kind": "change", "percent": 147}
    assert report["margin"] == round(3700 / 10700, 4)
    assert report["shrinkage"]["units"] == 1 and report["shrinkage"]["value"] == 350.0
    assert report["lead"] == {"days": 2.5, "deliveries": 2}
    plug = report["parts"]["spark_plug"]
    assert plug["averageDaily"] == round(19 / 30, 4)
    assert plug["cover"]["kind"] == "cover" and plug["cover"]["days"] == round(4 / (19 / 30), 3)
    assert plug["recommendation"] == {
        "kind": "ok",
        "level": 3,
        "leadDemand": round(2.5 * 19 / 30, 4),
        "safety": 1,
    }
    assert report["parts"]["petrol_filter"]["recommendation"]["level"] == 2
    assert report["lowestCover"] == "spark_plug"
    assert report["includesDemo"] is True
    assert len(report["byDay"]) == 30 and sum(d["units"] for d in report["byDay"].values()) == 20


def test_days_are_local_calendar_days():
    report = compute(MOVEMENTS, ORDERS, PRODUCTS, None, NOW, 7, None, TZ)
    assert report["period"]["start"] == "2026-11-06T00:00:00+05:30"
    assert list(report["byDay"])[0] == "2026-11-06" and list(report["byDay"])[-1] == "2026-11-12"


def test_one_part_and_the_edge_cases():
    report = compute(MOVEMENTS, ORDERS, PRODUCTS, None, NOW, 30, "petrol_filter", TZ)
    assert list(report["parts"]) == ["petrol_filter"]
    assert report["sales"] == {
        "units": 1,
        "value": 1200.0,
        "unpriced": 0,
        "profit": 850.0,
        "profitBase": 1200.0,
        "uncosted": 0,
    }
    assert report["change"] == {"kind": "new"}
    assert report["parts"]["petrol_filter"]["cover"] == {"kind": "no-scan"}
    assert report["lowestCover"] is None
    empty = compute([], [], PRODUCTS, {"spark_plug": 4}, NOW, 30, None, TZ)
    assert empty["parts"]["spark_plug"]["cover"] == {"kind": "no-sales"}
    assert empty["parts"]["spark_plug"]["recommendation"] == {
        "kind": "not-enough",
        "historyDays": 0,
        "deliveries": 0,
    }
    assert empty["includesDemo"] is False and empty["lead"] is None


def test_recommendation_and_change_rules():
    assert recommendation(1, {"days": 3, "deliveries": 3}, 30) == {
        "kind": "ok",
        "level": 5,
        "leadDemand": 3.0,
        "safety": 2,
    }
    assert recommendation(0.1, {"days": 2, "deliveries": 2}, 30)["level"] == 2
    assert recommendation(1, {"days": 3, "deliveries": 1}, 30) == {
        "kind": "not-enough",
        "historyDays": 30,
        "deliveries": 1,
    }
    assert recommendation(0, {"days": 3, "deliveries": 2}, 30) == {"kind": "no-sales"}
    assert sales_change(1200, 1000) == {"kind": "change", "percent": 20}
    assert sales_change(5, 0) == {"kind": "new"} and sales_change(0, 0) == {"kind": "none"}


def test_profit_uses_each_entrys_own_price_and_cost_and_counts_what_it_leaves_out():
    start, end = at(10), NOW
    totals = sales(
        [sale(1), sale(2, price=600) | {"unitCost": 400}, adjustment(3, "CustomerReturn", 1)], start, end
    )
    assert totals["profit"] == 150 + 200 - 150 and totals["profitBase"] == 500 + 600 - 500
    no_cost = sales([sale(1), sale(2) | {"unitCost": None}], start, end)
    assert no_cost == {
        "units": 2,
        "value": 1000.0,
        "unpriced": 0,
        "profit": 150.0,
        "profitBase": 500.0,
        "uncosted": 1,
    }
    no_price = sales([sale(1, price=None)], start, end)
    assert no_price["unpriced"] == 1 and no_price["profit"] == 0 and no_price["uncosted"] == 0


def test_weekly_buckets_count_back_from_today():
    by_day = {f"d{i:02d}": {**sales([], NOW, NOW), "units": 1} for i in range(90)}
    weekly = buckets(by_day, 7)
    assert len(weekly) == 13
    assert [b["days"] for b in weekly] == [6] + [7] * 12
    assert weekly[-1]["end"] == "d89" and weekly[-1]["start"] == "d83"
    assert sum(b["total"]["units"] for b in weekly) == 90
    assert len(buckets(by_day, 1)) == 90


def test_the_report_buckets_by_period_and_ranks_parts_by_profit():
    assert len(compute(MOVEMENTS, ORDERS, PRODUCTS, None, NOW, 30, None, TZ)["buckets"]) == 30
    assert len(compute(MOVEMENTS, ORDERS, PRODUCTS, None, NOW, 90, None, TZ)["buckets"]) == 13
    report = compute(MOVEMENTS, ORDERS, PRODUCTS, None, NOW, 30, None, TZ)
    assert [r["part"] for r in report["ranking"]] == ["spark_plug", "petrol_filter"]
    assert round(sum(r["profitShare"] for r in report["ranking"]), 3) == 1.0
    assert ranking({"a": {"name": "A", "sales": {"profit": 0, "units": 0}}})[0]["profitShare"] is None


def test_what_to_do_takes_the_first_matching_rule():
    ok = {"kind": "ok", "level": 2}
    assert what_to_do(None, 2, 1, ok, "Pending") == {"kind": "scan"}
    assert what_to_do(2, 2, 1, ok, None) == {"kind": "due"}
    assert what_to_do(0, 2, 1, ok, "Dispatched") == {"kind": "waiting", "state": "Dispatched"}
    assert what_to_do(4, 2, 1, {"kind": "ok", "level": 5}, None) == {
        "kind": "adjust",
        "level": 5,
        "direction": "raise",
    }
    assert what_to_do(4, 3, 1, {"kind": "ok", "level": 1}, None) == {
        "kind": "adjust",
        "level": 1,
        "direction": "lower",
    }
    early = {"kind": "not-enough", "historyDays": 3, "deliveries": 1}
    assert what_to_do(4, 2, 0, early, None) == {"kind": "no-sales"}
    assert what_to_do(4, 2, 1, early, None) == {"kind": "not-enough", "historyDays": 3, "deliveries": 1}
    assert what_to_do(4, 2, 1, ok, None) == {"kind": "ok"}


def test_an_open_order_is_found_and_a_cancelled_one_ignored():
    orders = [
        {"product": "petrol_filter", "state": "Pending"},
        {"product": "spark_plug", "state": "Cancelled"},
    ]
    report = compute(MOVEMENTS, orders, PRODUCTS, {"spark_plug": 4, "petrol_filter": 0}, NOW, 30, None, TZ)
    assert report["parts"]["petrol_filter"]["openOrder"] == "Pending"
    assert report["parts"]["petrol_filter"]["action"] == {"kind": "waiting", "state": "Pending"}
    assert report["parts"]["spark_plug"]["openOrder"] is None

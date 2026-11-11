"""The check script's maths on a fixed history: the same cases the browser's analytics tests cover."""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from scripts.insights_check import compute, recommendation, sales_change

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
    assert report["sales"] == {"units": 20, "value": 10700.0, "unpriced": 0}
    assert report["change"] == {"kind": "change", "percent": 114}
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
    assert report["sales"] == {"units": 1, "value": 1200.0, "unpriced": 0}
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

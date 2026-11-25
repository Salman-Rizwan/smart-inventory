"""Recompute every Insights figure from Firestore, independently of the browser code.

Run from backend/:
    python -m scripts.insights_check                  # the last 30 days, all parts, as JSON
    python -m scripts.insights_check --days 7 --part spark_plug
    python -m scripts.insights_check --now 2026-11-12T10:00:00+05:30   # pin "now" (default: the clock)

Reads only. The definitions are the ones in docs/DESIGN_DECISIONS.md ("Business intelligence in
the browser") and frontend/src/features/insights/analytics.ts, written again here from the
definitions rather than ported, so a slip in either implementation shows up as a difference. Days
are the shop's local calendar days (--tz, default Asia/Colombo), the same as a browser in the shop.
"""

import argparse
import json
import math
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

from app.core.config import get_settings
from app.firebase_db import init_firebase

PERIODS = (7, 30, 90)
WINDOW_DAYS = 180
MIN_HISTORY_DAYS = 14
MIN_DELIVERIES = 2
SAFETY_SHARE = 0.5
SHRINKAGE_REASONS = ("Damaged", "LostOrStolen")
OPEN_STATES = ("Pending", "Accepted", "Dispatched")
WEEK = 7
DEFAULT_TZ = "Asia/Colombo"


def midnight(moment: datetime) -> datetime:
    return moment.replace(hour=0, minute=0, second=0, microsecond=0)


def median(values: list[float]) -> float | None:
    if not values:
        return None
    values = sorted(values)
    middle = len(values) // 2
    return values[middle] if len(values) % 2 else (values[middle - 1] + values[middle]) / 2


def sale_units(movement: dict) -> int | None:
    """Units sold by one entry: a sale counts, a customer return counts negative, anything else not."""
    if movement["type"] == "Sale":
        return -movement["change"]
    if movement["type"] == "Adjustment" and movement.get("reason") == "CustomerReturn":
        return -movement["change"]
    return None


def new_totals() -> dict:
    return {"units": 0, "value": 0.0, "unpriced": 0, "profit": 0.0, "profitBase": 0.0, "uncosted": 0}


def sales(movements: list[dict], start: datetime, end: datetime, part: str | None = None) -> dict:
    """Net units, value at each entry's own price, and gross profit at its own price and cost.

    An entry with no price counts in `unpriced`; one with a price but no cost counts in `uncosted`
    and is left out of profit. `profitBase` is the sales value of the entries that count towards
    profit, the margin's denominator.
    """
    totals = new_totals()
    for m in movements:
        if not (start <= m["at"] < end) or (part and m["product"] != part):
            continue
        units = sale_units(m)
        if units is None:
            continue
        totals["units"] += units
        price, cost = m.get("unitPrice"), m.get("unitCost")
        if price is None:
            totals["unpriced"] += abs(units)
            continue
        totals["value"] = round(totals["value"] + units * price, 2)
        if cost is None:
            totals["uncosted"] += abs(units)
            continue
        totals["profit"] = round(totals["profit"] + units * (price - cost), 2)
        totals["profitBase"] = round(totals["profitBase"] + units * price, 2)
    return totals


def add_totals(into: dict, other: dict) -> None:
    for key, value in other.items():
        into[key] = round(into[key] + value, 2) if isinstance(value, float) else into[key] + value


def buckets(by_day: dict[str, dict], size: int) -> list[dict]:
    """Groups the days into blocks of `size`, counted back from the newest day."""
    days = list(by_day)
    out = []
    for end in range(len(days), 0, -size):
        chunk = days[max(0, end - size) : end]
        total = new_totals()
        for day in chunk:
            add_totals(total, by_day[day])
        out.insert(0, {"start": chunk[0], "end": chunk[-1], "days": len(chunk), "total": total})
    return out


def what_to_do(shelf: int | None, level: int, avg_daily: float, rec: dict, open_order: str | None) -> dict:
    """The first rule that matches: scan, order open or due, change the level, no sales, too early, OK."""
    if shelf is None:
        return {"kind": "scan"}
    if shelf <= level:
        return {"kind": "waiting", "state": open_order} if open_order else {"kind": "due"}
    if rec["kind"] == "ok" and rec["level"] != level:
        return {
            "kind": "adjust",
            "level": rec["level"],
            "direction": "raise" if rec["level"] > level else "lower",
        }
    if avg_daily <= 0:
        return {"kind": "no-sales"}
    if rec["kind"] == "not-enough":
        return {"kind": "not-enough", "historyDays": rec["historyDays"], "deliveries": rec["deliveries"]}
    return {"kind": "ok"}


def sales_change(current: float, previous: float) -> dict:
    if previous <= 0:
        return {"kind": "new"} if current > 0 else {"kind": "none"}
    return {"kind": "change", "percent": round((current - previous) / previous * 100)}


def shrinkage(
    movements: list[dict], start: datetime, end: datetime, sales_value: float, part: str | None
) -> dict:
    lines: dict[tuple[str, str], dict] = {}
    report = {"units": 0, "value": 0.0, "uncosted": 0}
    for m in movements:
        if m["type"] != "Adjustment" or m["change"] >= 0 or m.get("reason") not in SHRINKAGE_REASONS:
            continue
        if not (start <= m["at"] < end) or (part and m["product"] != part):
            continue
        line = lines.setdefault((m["product"], m["reason"]), {"units": 0, "value": 0.0, "uncosted": 0})
        units = -m["change"]
        line["units"] += units
        report["units"] += units
        if m.get("unitCost") is None:
            line["uncosted"] += units
            report["uncosted"] += units
        else:
            line["value"] = round(line["value"] + units * m["unitCost"], 2)
            report["value"] = round(report["value"] + units * m["unitCost"], 2)
    report["lines"] = {f"{p}:{r}": line for (p, r), line in sorted(lines.items())}
    report["shareOfSales"] = round(report["value"] / sales_value, 4) if sales_value > 0 else None
    return report


def lead_time(orders: list[dict], start: datetime, end: datetime) -> dict | None:
    leads = []
    for o in orders:
        if o.get("state") != "Received" or not o.get("createdAt") or not o.get("receivedAt"):
            continue
        if not (start <= o["receivedAt"] < end):
            continue
        leads.append(max(0.0, (o["receivedAt"] - o["createdAt"]).total_seconds() / 86400))
    days = median(leads)
    return None if days is None else {"days": round(days, 3), "deliveries": len(leads)}


def recommendation(average_daily: float, lead: dict | None, history_days: float) -> dict:
    deliveries = lead["deliveries"] if lead else 0
    if history_days < MIN_HISTORY_DAYS or deliveries < MIN_DELIVERIES or not lead:
        return {"kind": "not-enough", "historyDays": math.floor(history_days), "deliveries": deliveries}
    if average_daily <= 0:
        return {"kind": "no-sales"}
    lead_demand = average_daily * lead["days"]
    safety = max(1, math.ceil(lead_demand * SAFETY_SHARE))
    return {
        "kind": "ok",
        "level": math.ceil(lead_demand + safety),
        "leadDemand": round(lead_demand, 4),
        "safety": safety,
    }


def cover(shelf: int | None, average_daily: float, reorder_level: int) -> dict:
    if shelf is None:
        return {"kind": "no-scan"}
    if average_daily <= 0:
        return {"kind": "no-sales"}
    return {
        "kind": "cover",
        "days": round(shelf / average_daily, 3),
        "untilReorder": round(max(0, shelf - reorder_level) / average_daily, 3),
    }


def ranking(parts: dict[str, dict]) -> list[dict]:
    """Parts by gross profit, then units, then name, each with its share of the total profit."""
    total = sum(p["sales"]["profit"] for p in parts.values())
    ordered = sorted(
        parts.items(), key=lambda kv: (-kv[1]["sales"]["profit"], -kv[1]["sales"]["units"], kv[1]["name"])
    )
    return [
        {"part": pid, "profitShare": round(p["sales"]["profit"] / total, 4) if total > 0 else None}
        for pid, p in ordered
    ]


def load(db, since: datetime) -> tuple[list[dict], list[dict], dict[str, dict], dict | None]:
    movements = []
    for doc in db.collection("stock_movements").where(filter=FieldFilter("at", ">=", since)).stream():
        data = doc.to_dict() or {}
        if isinstance(data.get("at"), datetime):
            movements.append({**data, "id": doc.id})
    orders = [
        {**(doc.to_dict() or {}), "id": doc.id}
        for doc in db.collection("purchase_orders")
        .where(filter=FieldFilter("createdAt", ">=", since))
        .stream()
    ]
    products = {doc.id: doc.to_dict() or {} for doc in db.collection("products").stream()}
    status = db.document("status/latest").get().to_dict()
    return movements, orders, products, status


def compute(
    movements: list[dict],
    orders: list[dict],
    products: dict[str, dict],
    counts: dict | None,
    now: datetime,
    days: int,
    part: str | None,
    tz: ZoneInfo,
) -> dict:
    local_now = now.astimezone(tz)
    today = midnight(local_now)
    start = today - timedelta(days=days - 1)
    previous_start = today - timedelta(days=2 * days - 1)
    chosen = sorted(pid for pid in products if not part or pid == part)
    total = sales(movements, start, now, part)
    previous = sales(movements, previous_start, start, part)
    lead = lead_time(orders, start, now)

    parts = {}
    for pid in chosen:
        own = sales(movements, start, now, pid)
        average_daily = own["units"] / days
        open_order = next(
            (o["state"] for o in orders if o.get("product") == pid and o.get("state") in OPEN_STATES), None
        )
        shelf = counts.get(pid) if counts and isinstance(counts.get(pid), int) else None
        own_times = [m["at"] for m in movements if m["product"] == pid]
        history_days = (now - min(own_times)).total_seconds() / 86400 if own_times else 0
        level = products[pid].get("reorderLevel") or 0
        parts[pid] = {
            "name": products[pid].get("name") or pid,
            "sales": own,
            "averageDaily": round(average_daily, 4),
            "shelf": shelf,
            "reorderLevel": level,
            "cover": cover(shelf, average_daily, level),
            "historyDays": round(history_days, 2),
            "recommendation": recommendation(average_daily, lead, history_days),
            "openOrder": open_order,
        }
        parts[pid]["action"] = what_to_do(
            shelf, level, average_daily, parts[pid]["recommendation"], open_order
        )
    covered = [(p["cover"]["days"], pid) for pid, p in parts.items() if p["cover"]["kind"] == "cover"]
    by_day: dict[str, dict] = {}
    for offset in range(days):
        day = start + timedelta(days=offset)
        by_day[day.strftime("%Y-%m-%d")] = sales(movements, day, min(day + timedelta(days=1), now), part)

    def in_period(at):
        return isinstance(at, datetime) and start <= at < now

    includes_demo = any(
        m.get("seeded") and in_period(m["at"]) and (not part or m["product"] == part) for m in movements
    ) or any(
        o.get("seeded")
        and (in_period(o.get("receivedAt")) or in_period(o.get("createdAt")))
        and (not part or o.get("product") == part)
        for o in orders
    )
    return {
        "now": now.isoformat(),
        "tz": str(tz),
        "period": {"days": days, "start": start.isoformat(), "previousStart": previous_start.isoformat()},
        "part": part,
        "sales": total,
        "change": sales_change(total["value"], previous["value"]),
        "profitChange": sales_change(total["profit"], previous["profit"]),
        "margin": round(total["profit"] / total["profitBase"], 4) if total["profitBase"] > 0 else None,
        "byDay": by_day,
        "buckets": buckets(by_day, WEEK if days > 30 else 1),
        "ranking": ranking(parts),
        "shrinkage": shrinkage(movements, start, now, total["value"], part),
        "lead": lead,
        "lowestCover": min(covered)[1] if covered else None,
        "parts": parts,
        "includesDemo": includes_demo,
        "loaded": {"movements": len(movements), "orders": len(orders)},
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--days", type=int, choices=PERIODS, default=30)
    parser.add_argument("--part", default=None, help="one product id, or all parts when omitted")
    parser.add_argument("--now", default=None, help="ISO time to compute at (default: now)")
    parser.add_argument("--tz", default=DEFAULT_TZ)
    args = parser.parse_args()

    tz = ZoneInfo(args.tz)
    now = datetime.fromisoformat(args.now) if args.now else datetime.now(UTC)
    if now.tzinfo is None:
        now = now.replace(tzinfo=tz)
    init_firebase(get_settings().firebase_key_path)
    db = firestore.client()
    since = midnight(now.astimezone(tz)) - timedelta(days=WINDOW_DAYS)
    movements, orders, products, status = load(db, since)
    counts = (status or {}).get("counts")
    print(json.dumps(compute(movements, orders, products, counts, now, args.days, args.part, tz), indent=2))


if __name__ == "__main__":
    main()

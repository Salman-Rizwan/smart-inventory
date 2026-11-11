"""Seed about 30 days of demo trading history so Insights has something to show.

Run from backend/:
    python -m scripts.seed_history            # dry run: shows what would be written, writes nothing
    python -m scripts.seed_history --apply    # writes it
    python -m scripts.seed_history --clear    # removes only what this script wrote

What it writes: stock_movements (sales, customer returns, write-offs with reasons and the delivery
of every order), purchase_orders (Received, with every stage time) and a few Resolved alerts. The
history is planned BACKWARDS from each part's real POS count, so the chain of entries ends exactly at
the count the product has now and the real log carries on from it. Deliveries land where the stock
had run low, as in real trading.

Marking: every document has `seeded: true`, movements have `by: "seed_history"`, and every id starts
with "seedh-", so a rerun overwrites the same documents and --clear deletes only these. Orders that
this script did not create (real ones, or seed_orders' samples) are never touched. A part with no
cost or price gets the demo figures below, because sales value needs a price on every entry.
"""

import argparse
import random
from dataclasses import dataclass, field
from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

from app.core.config import get_settings
from app.firebase_db import init_firebase

PREFIX = "seedh-"
BY = "seed_history"
DAYS = 30
DELIVERY_QTY = 10
LEAD_DAYS = (2, 4)  # dealer lead time, inclusive range in days
SALES_PER_DAY = {"spark_plug": 1.0, "petrol_filter": 1 / 3}
DEFAULT_SALES_PER_DAY = 0.5
DEMO_PRICES = {"spark_plug": (350, 500), "petrol_filter": (900, 1200)}  # (unitCost, unitPrice), LKR
WRITE_OFFS = {"spark_plug": ("Damaged", "LostOrStolen"), "petrol_filter": ("Damaged",)}
RETURNS_PER_PART = 1
ALERTS = 6
SHOP_OPEN, SHOP_CLOSE = 9, 18  # local hours when sales happen
DEFAULT_TZ = "Asia/Colombo"


@dataclass(frozen=True)
class Part:
    id: str
    name: str
    pos_count: int
    reorder_level: int
    unit_cost: float
    unit_price: float


@dataclass
class History:
    movements: dict[str, dict] = field(default_factory=dict)
    orders: dict[str, dict] = field(default_factory=dict)
    alerts: dict[str, dict] = field(default_factory=dict)
    last_movement: dict[str, str] = field(default_factory=dict)  # part id -> its newest entry id


def _daily_sales(rate: float, rng: random.Random) -> int:
    """A plausible number of sales for one day around `rate`: the whole part plus a chance of one more."""
    count = int(rate) + (1 if rng.random() < rate - int(rate) else 0)
    roll = rng.random()
    if roll < 0.2 * rate:
        count += 1  # a busy day
    elif roll < 0.35 * rate:
        count = max(0, count - 1)  # a quiet one
    return count


def _moment(day: datetime, hour: float) -> datetime:
    return day + timedelta(hours=hour)


def _plan_events(part: Part, now: datetime, days: int, tz: ZoneInfo, rng: random.Random) -> list[dict]:
    """The sales, returns and write-offs of one part, in time order, before any counts are known."""
    local_now = now.astimezone(tz)
    today = datetime.combine(local_now.date(), time(0), tzinfo=tz)
    rate = SALES_PER_DAY.get(part.id, DEFAULT_SALES_PER_DAY)
    events: list[dict] = []
    for back in range(days):
        day = today - timedelta(days=back)
        close = SHOP_CLOSE if back else min(SHOP_CLOSE, (local_now - today).total_seconds() / 3600 - 0.25)
        if close <= SHOP_OPEN:
            continue
        for _ in range(_daily_sales(rate, rng)):
            events.append({"type": "Sale", "change": -1, "at": _moment(day, rng.uniform(SHOP_OPEN, close))})
    # customer returns and write-offs, on days safely inside the window
    for _ in range(RETURNS_PER_PART):
        day = today - timedelta(days=rng.randint(5, days - 5))
        at = _moment(day, rng.uniform(SHOP_OPEN, SHOP_CLOSE))
        events.append({"type": "Adjustment", "change": 1, "reason": "CustomerReturn", "at": at})
    for reason in WRITE_OFFS.get(part.id, ("Damaged",)):
        day = today - timedelta(days=rng.randint(3, days - 3))
        at = _moment(day, rng.uniform(SHOP_OPEN, SHOP_CLOSE))
        events.append({"type": "Adjustment", "change": -1, "reason": reason, "at": at})
    events.sort(key=lambda e: e["at"])
    return events


def _walk_back(part: Part, events: list[dict], rng: random.Random) -> list[dict]:
    """Assigns counts from the newest event backwards, starting at the real POS count, and places a
    delivery wherever the stock before it would have been low. A return that would need a negative
    count is dropped. Returns the entries in time order with posBefore and posAfter set."""
    low = max(part.reorder_level, 2)
    chain: list[dict] = []
    running = part.pos_count
    for index in range(len(events) - 1, -1, -1):
        event = dict(events[index])
        before = running - event["change"]
        if before < 0:
            continue  # the shop could not have taken this return then
        event["posBefore"], event["posAfter"] = before, running
        chain.append(event)
        running = before
        if event["type"] == "Sale" and DELIVERY_QTY <= running <= DELIVERY_QTY + low:
            earlier = events[index - 1]["at"] if index else event["at"] - timedelta(days=1)
            at = earlier + (event["at"] - earlier) * rng.uniform(0.3, 0.7)
            delivery = {"type": "OrderReceived", "change": DELIVERY_QTY, "at": at}
            delivery["posBefore"], delivery["posAfter"] = running - DELIVERY_QTY, running
            chain.append(delivery)
            running -= DELIVERY_QTY
    chain.reverse()
    return chain


def _order_for(part: Part, received_at: datetime, rng: random.Random) -> dict:
    lead = timedelta(days=rng.uniform(*LEAD_DAYS))
    created = received_at - lead
    accepted = created + timedelta(hours=rng.uniform(2, 6))
    dispatched = received_at - timedelta(hours=rng.uniform(6, 20))
    if dispatched <= accepted:
        dispatched = accepted + timedelta(hours=1)
    return {
        "product": part.id,
        "productName": part.name,
        "qty": DELIVERY_QTY,
        "state": "Received",
        "createdAt": created,
        "acceptedAt": accepted,
        "dispatchedAt": dispatched,
        "receivedAt": received_at,
        "receivedBy": BY,
        "source": "auto",
        "seeded": True,
    }


def _pos_at(chain: list[dict], at: datetime, pos_now: int) -> int:
    """The POS count a part had at `at`, read from its chain."""
    pos = chain[0]["posBefore"] if chain else pos_now
    for entry in chain:
        if entry["at"] > at:
            break
        pos = entry["posAfter"]
    return pos


def plan_history(
    parts: list[Part], now: datetime, days: int = DAYS, seed: int = 1, tz: str = DEFAULT_TZ
) -> History:
    """Pure and reproducible: the same parts, time and seed always give the same history."""
    if days < 14:
        raise ValueError("days must be at least 14")
    zone = ZoneInfo(tz)
    rng = random.Random(seed)
    history = History()
    chains: dict[str, list[dict]] = {}
    for part in sorted(parts, key=lambda p: p.id):
        chain = _walk_back(part, _plan_events(part, now, days, zone, rng), rng)
        chains[part.id] = chain
        orders = 0
        for index, entry in enumerate(chain, start=1):
            movement_id = f"{PREFIX}{part.id}-m{index:03d}"
            doc = {
                "product": part.id,
                "type": entry["type"],
                "change": entry["change"],
                "posBefore": entry["posBefore"],
                "posAfter": entry["posAfter"],
                "unitCost": part.unit_cost,
                "unitPrice": part.unit_price,
                "by": BY,
                "at": entry["at"].astimezone(UTC),
                "seeded": True,
            }
            if entry["type"] == "Adjustment":
                doc["reason"] = entry["reason"]
            if entry["type"] == "OrderReceived":
                orders += 1
                order_id = f"{PREFIX}{part.id}-o{orders}"
                order = _order_for(part, entry["at"], rng)
                history.orders[order_id] = {
                    **order,
                    **{
                        k: order[k].astimezone(UTC)
                        for k in ("createdAt", "acceptedAt", "dispatchedAt", "receivedAt")
                    },
                }
                doc["orderId"] = order_id
            history.movements[movement_id] = doc
            history.last_movement[part.id] = movement_id
    # a few mismatches that were noticed and resolved, spread over the period
    local_now = now.astimezone(zone)
    today = datetime.combine(local_now.date(), time(0), tzinfo=zone)
    for index in range(1, ALERTS + 1):
        part = sorted(parts, key=lambda p: p.id)[index % len(parts)]
        created = _moment(
            today - timedelta(days=rng.randint(2, days - 2)), rng.uniform(SHOP_OPEN, SHOP_CLOSE - 2)
        )
        pos = _pos_at(chains[part.id], created, part.pos_count)
        alert = {
            "product": part.id,
            "visualCount": max(0, pos - 1) if pos else pos + 1,
            "posCount": pos,
            "state": "Resolved",
            "createdAt": created.astimezone(UTC),
            "resolvedAt": (created + timedelta(hours=rng.uniform(1, 3))).astimezone(UTC),
            "seeded": True,
        }
        if index % 2:
            alert["acknowledgedAt"] = (created + timedelta(minutes=rng.uniform(10, 50))).astimezone(UTC)
            alert["acknowledgedBy"] = BY
        history.alerts[f"{PREFIX}a{index}"] = alert
    return history


def replay(history: History, part_id: str) -> int | None:
    """Runs the part's entries in time order and returns the final count, or None with no entries.
    Raises ValueError when consecutive entries do not join up (used by the tests and the dry run)."""
    entries = sorted(
        (m for m in history.movements.values() if m["product"] == part_id), key=lambda m: m["at"]
    )
    if not entries:
        return None
    pos = entries[0]["posBefore"]
    for entry in entries:
        if entry["posBefore"] != pos or entry["posAfter"] != pos + entry["change"] or pos < 0:
            raise ValueError(f"{part_id}: the chain breaks at {entry}")
        pos = entry["posAfter"]
    return pos


def summarise(history: History, parts: list[Part]) -> str:
    lines = []
    for part in sorted(parts, key=lambda p: p.id):
        entries = [m for m in history.movements.values() if m["product"] == part.id]
        kinds = {
            kind: sum(1 for m in entries if m["type"] == kind)
            for kind in ("Sale", "OrderReceived", "Adjustment")
        }
        start = min(entries, key=lambda m: m["at"])["posBefore"] if entries else part.pos_count
        lines.append(
            f"  {part.id}: {len(entries)} entries ({kinds['Sale']} sales, "
            f"{kinds['OrderReceived']} deliveries, {kinds['Adjustment']} adjustments), "
            f"POS {start} -> {replay(history, part.id)} "
            f"(now {part.pos_count}), cost {part.unit_cost} price {part.unit_price}"
        )
    lines.append(f"  orders: {len(history.orders)} Received, alerts: {len(history.alerts)} Resolved")
    return "\n".join(lines)


def _money(value: object) -> float | None:
    return (
        float(value)
        if isinstance(value, (int, float)) and not isinstance(value, bool) and value >= 0
        else None
    )


def load_parts(db) -> tuple[list[Part], dict[str, dict]]:
    """Reads the products and fills in demo prices where none is set. Returns the parts and the
    price updates that --apply writes."""
    parts: list[Part] = []
    price_updates: dict[str, dict] = {}
    for doc in db.collection("products").stream():
        data = doc.to_dict() or {}
        pos = data.get("posCount")
        if not isinstance(pos, int) or isinstance(pos, bool) or pos < 0:
            raise SystemExit(f"products/{doc.id} has no valid posCount; run scripts.seed_products first")
        cost, price = _money(data.get("unitCost")), _money(data.get("unitPrice"))
        if cost is None or price is None:
            if doc.id not in DEMO_PRICES:
                raise SystemExit(f"products/{doc.id} has no cost or price. Set them in Part Settings first.")
            demo_cost, demo_price = DEMO_PRICES[doc.id]
            cost, price = cost if cost is not None else demo_cost, price if price is not None else demo_price
            price_updates[doc.id] = {"unitCost": cost, "unitPrice": price}
        level = data.get("reorderLevel")
        parts.append(
            Part(
                id=doc.id,
                name=str(data.get("name") or doc.id),
                pos_count=pos,
                reorder_level=level if isinstance(level, int) and level >= 0 else 0,
                unit_cost=cost,
                unit_price=price,
            )
        )
    if not parts:
        raise SystemExit("No products found. Run python -m scripts.seed_products first.")
    return parts, price_updates


def _seeded_ids(db, collection: str) -> list[str]:
    query = db.collection(collection).where(filter=FieldFilter("seeded", "==", True))
    return [doc.id for doc in query.stream() if doc.id.startswith(PREFIX)]


def clear(db) -> dict[str, int]:
    """Deletes only this script's documents and unhooks products that point at one of its entries."""
    removed: dict[str, int] = {}
    for collection in ("stock_movements", "purchase_orders", "alerts"):
        ids = _seeded_ids(db, collection)
        batch = db.batch()
        for doc_id in ids:
            batch.delete(db.collection(collection).document(doc_id))
        batch.commit()
        removed[collection] = len(ids)
    for doc in db.collection("products").stream():
        if str((doc.to_dict() or {}).get("lastMovementId", "")).startswith(PREFIX):
            doc.reference.update({"lastMovementId": firestore.DELETE_FIELD})
    return removed


def apply(db, history: History, parts: list[Part], price_updates: dict[str, dict]) -> None:
    writes: list[tuple] = []
    for collection, docs in (
        ("stock_movements", history.movements),
        ("purchase_orders", history.orders),
        ("alerts", history.alerts),
    ):
        writes += [(db.collection(collection).document(doc_id), doc) for doc_id, doc in docs.items()]
    for start in range(0, len(writes), 400):
        batch = db.batch()
        for ref, doc in writes[start : start + 400]:
            batch.set(ref, doc)
        batch.commit()
    for part in parts:
        fields = (
            {"lastMovementId": history.last_movement[part.id]} if part.id in history.last_movement else {}
        )
        if part.id in price_updates:
            fields.update(price_updates[part.id], updatedBy=BY, updatedAt=firestore.SERVER_TIMESTAMP)
        if fields:
            db.collection("products").document(part.id).update(fields)


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--apply", action="store_true", help="write the history (without it, only show it)")
    parser.add_argument("--clear", action="store_true", help="remove the seeded history")
    parser.add_argument("--days", type=int, default=DAYS, help=f"days of history (default {DAYS})")
    parser.add_argument("--seed", type=int, default=1, help="random seed, for a reproducible history")
    parser.add_argument("--tz", default=DEFAULT_TZ, help=f"the shop's time zone (default {DEFAULT_TZ})")
    args = parser.parse_args()

    init_firebase(get_settings().firebase_key_path)
    db = firestore.client()
    if args.clear:
        for collection, count in clear(db).items():
            print(f"{collection}: removed {count} seeded document(s)")
        return

    parts, price_updates = load_parts(db)
    existing = {c: len(_seeded_ids(db, c)) for c in ("stock_movements", "purchase_orders", "alerts")}
    history = plan_history(parts, datetime.now(UTC), days=args.days, seed=args.seed, tz=args.tz)
    for part in parts:
        if replay(history, part.id) not in (None, part.pos_count):
            raise SystemExit(f"Planner bug: {part.id} does not replay to {part.pos_count}")
    print("Dry run: nothing will be written. Add --apply to do it.\n" if not args.apply else "Writing:\n")
    print(summarise(history, parts))
    for part_id, prices in price_updates.items():
        print(f"  products/{part_id}: no cost or price set; demo figures {prices} will be stored")
    if any(existing.values()):
        print(f"  already seeded (will be overwritten): {existing}")
    if not args.apply:
        return
    apply(db, history, parts, price_updates)
    print("\nDone. Open Insights to see it; python -m scripts.seed_history --clear removes it.")


if __name__ == "__main__":
    main()

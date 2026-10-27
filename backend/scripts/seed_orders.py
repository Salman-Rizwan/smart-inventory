"""Seed sample purchase orders so the dealer dashboard has something to show.

Run from backend/:
    python -m scripts.seed_orders           # create or reset the sample orders
    python -m scripts.seed_orders --clear   # remove them again

The orders go into the real purchase_orders collection, one per state, using the products that
already exist (run scripts.seed_products first). They are marked seeded=true, so --clear removes
only them. Run --clear before demonstrating automatic reordering: an open seeded order for a part
stops the backend from raising a new one for that part.
"""

import argparse
from datetime import UTC, datetime, timedelta

from firebase_admin import firestore

from app.core.config import get_settings
from app.firebase_db import init_firebase

STATES = ("Pending", "Accepted", "Dispatched", "Received")
AGE_HOURS = {"Pending": 2, "Accepted": 20, "Dispatched": 30, "Received": 72}  # how long ago it was raised
STEP_FIELDS = {"Accepted": "acceptedAt", "Dispatched": "dispatchedAt", "Received": "receivedAt"}


def build_orders(products: dict[str, int], now: datetime) -> dict[str, dict]:
    """One sample order per state, cycling through the products. `products` maps id -> reorder quantity."""
    if not products:
        raise ValueError("No products to order. Run python -m scripts.seed_products first.")
    ids = sorted(products)
    orders: dict[str, dict] = {}
    for index, state in enumerate(STATES):
        product = ids[index % len(ids)]
        raised = now - timedelta(hours=AGE_HOURS[state])
        order = {
            "product": product,
            "qty": products[product],
            "state": state,
            "createdAt": raised,
            "seeded": True,
        }
        # every step the order has already been through carries its own timestamp, an hour apart
        for step, state_name in enumerate(STATES[1 : STATES.index(state) + 1], start=1):
            order[STEP_FIELDS[state_name]] = raised + timedelta(hours=step)
        orders[f"seed-{index + 1}-{state.lower()}"] = order
    return orders


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--clear", action="store_true", help="remove the seeded orders")
    args = parser.parse_args()

    init_firebase(get_settings().firebase_key_path)
    db = firestore.client()
    orders = db.collection("purchase_orders")

    if args.clear:
        removed = 0
        for doc in orders.where("seeded", "==", True).stream():
            doc.reference.delete()
            removed += 1
        print(f"Removed {removed} seeded order(s).")
        return

    quantities = {}
    for doc in db.collection("products").stream():
        qty = (doc.to_dict() or {}).get("reorderQty")
        quantities[doc.id] = qty if isinstance(qty, int) and qty >= 1 else 10
    try:
        built = build_orders(quantities, datetime.now(UTC))
    except ValueError as error:
        raise SystemExit(str(error)) from error
    for doc_id, order in built.items():
        orders.document(doc_id).set(order)
        print(f"purchase_orders/{doc_id}: {order['qty']} x {order['product']} ({order['state']})")


if __name__ == "__main__":
    main()

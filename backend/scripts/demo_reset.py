"""Put the system into a clean, known state for a demo or a rehearsal.

Run from backend/:
    python -m scripts.demo_reset            # dry run: shows what would change, changes nothing
    python -m scripts.demo_reset --apply    # does it

Resets each product's POS count and reorder settings to the demo values below, resets the low-scan
counts, and clears all purchase orders, alerts and notification read state. It keeps the scan
history, the users and the model. Scan once afterwards to refresh the dashboard.

Demo values: 4 spark plugs and 1 petrol filter on the shelf, matching the POS. A spark plug reorders
when 3 or fewer are left, so removing one plug and scanning twice raises an order. The order is for
1 plug, so that when it is "delivered" and the plug you took away is put back, the shelf and the POS
agree again and the whole loop closes. The filter only reorders when none are left, so it does not
raise an order while it sits on the shelf.
"""

import argparse

from firebase_admin import firestore

from app.core.config import get_settings
from app.firebase_db import init_firebase

DEMO_PRODUCTS: dict[str, dict[str, int]] = {
    "spark_plug": {"posCount": 4, "reorderLevel": 3, "reorderQty": 1},
    "petrol_filter": {"posCount": 1, "reorderLevel": 0, "reorderQty": 10},
}
CLEARED_COLLECTIONS = ("purchase_orders", "alerts", "notification_reads")


def plan_reset(existing: dict[str, dict]) -> dict[str, dict[str, int]]:
    """The fields to set on each product that exists. Any other class is left alone."""
    return {pid: dict(values) for pid, values in DEMO_PRODUCTS.items() if pid in existing}


def describe_change(product_id: str, current: dict, target: dict[str, int]) -> str:
    changes = [
        f"{key} {current.get(key)} -> {value}" for key, value in target.items() if current.get(key) != value
    ]
    if current.get("lowScanStreak"):
        changes.append(f"lowScanStreak {current['lowScanStreak']} -> 0")
    return f"products/{product_id}: " + (", ".join(changes) if changes else "already as in the demo")


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--apply", action="store_true", help="make the changes (without it, only show them)")
    args = parser.parse_args()

    init_firebase(get_settings().firebase_key_path)
    db = firestore.client()
    existing = {doc.id: doc.to_dict() or {} for doc in db.collection("products").stream()}
    updates = plan_reset(existing)
    if not updates:
        raise SystemExit("No known products found. Run python -m scripts.seed_products first.")

    print("Dry run: nothing will be changed. Add --apply to do it.\n" if not args.apply else "Applying:\n")
    for product_id, target in updates.items():
        print(" ", describe_change(product_id, existing[product_id], target))
    counts = {name: len(list(db.collection(name).stream())) for name in CLEARED_COLLECTIONS}
    for name, count in counts.items():
        print(f"  {name}: {count} document(s) to delete")
    skipped = sorted(set(existing) - set(updates))
    if skipped:
        print(f"  left alone (no demo values): {', '.join(skipped)}")

    if not args.apply:
        return
    for product_id, target in updates.items():
        db.collection("products").document(product_id).update(
            {**target, "lowScanStreak": firestore.DELETE_FIELD}
        )
    for name in CLEARED_COLLECTIONS:
        for doc in db.collection(name).stream():
            doc.reference.delete()
    print("\nDone. Scan once to refresh the dashboard.")


if __name__ == "__main__":
    main()

"""Create the products/{class name} documents from the model's own class names.

Run from backend/:  python -m scripts.seed_products
Existing products are left alone unless you pass --reset (which restores the seed values).

Product ids equal the model's class names, so a new part only needs a retrained model and one
more document here (NFR7). Starting POS figures for the demo are set below; override any with
--pos spark_plug=5, or change them later in the Firebase console.
"""

import argparse

from firebase_admin import firestore
from ultralytics import YOLO

from app.core.config import get_settings
from app.firebase_db import init_firebase

DEMO_POS = {"spark_plug": 4, "petrol_filter": 1}  # matches the demo shelf: 4 plugs, 1 filter
DEFAULT_POS = 0
REORDER_LEVEL = 2
REORDER_QTY = 10


def label(class_name: str) -> str:
    return " ".join(word.capitalize() for word in class_name.split("_") if word)


def parse_overrides(pairs: list[str]) -> dict[str, int]:
    overrides: dict[str, int] = {}
    for pair in pairs:
        name, sep, value = pair.partition("=")
        if not sep or not value.isdigit():
            raise SystemExit(f"--pos expects name=number (for example spark_plug=5), got {pair!r}")
        overrides[name] = int(value)
    return overrides


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--pos", action="append", default=[], metavar="NAME=N", help="starting POS count")
    parser.add_argument("--reset", action="store_true", help="overwrite products that already exist")
    args = parser.parse_args()
    overrides = parse_overrides(args.pos)

    settings = get_settings()
    classes = list(YOLO(str(settings.model_path)).names.values())
    unknown = set(overrides) - set(classes)
    if unknown:
        raise SystemExit(f"Not model classes: {sorted(unknown)}. The model knows: {classes}")

    init_firebase(settings.firebase_key_path)
    products = firestore.client().collection("products")
    for name in classes:
        ref = products.document(name)
        if ref.get().exists and not args.reset:
            print(f"products/{name}: already exists, left unchanged")
            continue
        pos = overrides.get(name, DEMO_POS.get(name, DEFAULT_POS))
        # status is set by the backend after the first scan
        ref.set(
            {"name": label(name), "posCount": pos, "reorderLevel": REORDER_LEVEL, "reorderQty": REORDER_QTY}
        )
        print(f"products/{name}: posCount={pos}, reorderLevel={REORDER_LEVEL}, reorderQty={REORDER_QTY}")


if __name__ == "__main__":
    main()

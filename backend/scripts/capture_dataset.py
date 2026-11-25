"""Capture a burst of webcam photos for building the training dataset.

Run from backend/ (stop other users of the webcam first):

    python -m scripts.capture_dataset negatives --count 150 --interval 1.5
    python -m scripts.capture_dataset parts --count 50 --interval 2

Move things around in front of the camera while it runs: change the layout, lighting,
add hands, other objects, people. Photos are saved at the webcam's full resolution to
dataset_capture/<name>/ (gitignored).
"""

import argparse
import time
from datetime import datetime
from pathlib import Path

import cv2

from app.core.config import get_settings

WARMUP_FRAMES = 15


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("name", help="folder name, e.g. negatives or parts")
    parser.add_argument("--count", type=int, default=100, help="number of photos (default 100)")
    parser.add_argument("--interval", type=float, default=1.5, help="seconds between photos (default 1.5)")
    parser.add_argument("--countdown", type=int, default=5, help="seconds before the first photo (default 5)")
    args = parser.parse_args()
    if args.count < 1 or args.interval < 0.2:
        raise SystemExit("--count must be at least 1 and --interval at least 0.2 seconds")

    out = Path("dataset_capture") / args.name
    out.mkdir(parents=True, exist_ok=True)

    cam = cv2.VideoCapture(get_settings().camera_index)
    if not cam.isOpened():
        raise SystemExit("Webcam not found - check camera permission and CAMERA_INDEX")
    try:
        for _ in range(WARMUP_FRAMES):
            cam.read()
        for s in range(args.countdown, 0, -1):
            print(f"Starting in {s}...", end="\r", flush=True)
            time.sleep(1)
        saved = 0
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        while saved < args.count:
            started = time.monotonic()
            ok, frame = cam.read()
            if not ok:
                print("\nCould not read a frame, skipping")
            else:
                saved += 1
                cv2.imwrite(str(out / f"{args.name}_{stamp}_{saved:04d}.jpg"), frame)
                print(f"Saved {saved}/{args.count}", end="\r", flush=True)
            time.sleep(max(0.0, args.interval - (time.monotonic() - started)))
    finally:
        cam.release()
    print(f"\nDone: {saved} photos in {out.resolve()}")


if __name__ == "__main__":
    main()

"""Detection accuracy for the report (Group 4, item 31): capture known shelf arrangements, then score them.

The camera and the model run here exactly as the backend runs them (the same .env settings: camera index,
confidence, oversize guards, dark-frame threshold). Nothing is written to Firestore. Stop the backend
first: it holds the camera and would scan the arrangements into the live data.

    python -m scripts.accuracy_run capture nov16 --arrangements 10 \
        --conditions "room light,daylight,side lamp"
    python -m scripts.accuracy_run score nov16

capture: for each arrangement, type the true count of every part (Enter keeps the last value), then for
each lighting condition set the light and press Enter. It takes --frames frames (default 3), saves the raw
and annotated images under evaluation/<run>/ (gitignored) and appends one CSV row per part per frame.
Running it again with the same run name continues the arrangement numbering.
score: prints Markdown tables per lighting condition for docs/REPORT_NOTES.md.

Scored by count, not by box: per part, matched = min(true, predicted), precision = matched / predicted,
recall = matched / true. A missed part and a false one in the same frame cancel out in the count, so look
at the annotated images for those. Frames too dark to count (the backend would skip them) are listed, not
scored.
"""

import argparse
import csv
import re
import socket
import time
from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

import cv2

from app.core.config import BACKEND_DIR
from app.frame_quality import frame_brightness, is_too_dark

FIELDS = [
    "arrangement",
    "condition",
    "frame",
    "part",
    "true",
    "predicted",
    "brightness",
    "dark",
    "inferenceMs",
    "ignored",
    "note",
    "image",
]
ALL = "All conditions"
RUN_NAME = re.compile(r"^[A-Za-z0-9_-]+$")
FRAME_INTERVAL_SECONDS = 1.0
BACKEND_PORT = 8000


@dataclass(frozen=True)
class Row:
    arrangement: int
    condition: str
    frame: int
    part: str
    true: int
    predicted: int
    brightness: float
    dark: bool
    inference_ms: float = 0.0
    ignored: int = 0
    note: str = ""
    image: str = ""

    def to_csv(self) -> dict[str, str]:
        return {
            "arrangement": str(self.arrangement),
            "condition": self.condition,
            "frame": str(self.frame),
            "part": self.part,
            "true": str(self.true),
            "predicted": str(self.predicted),
            "brightness": f"{self.brightness:.1f}",
            "dark": "yes" if self.dark else "no",
            "inferenceMs": f"{self.inference_ms:.1f}",
            "ignored": str(self.ignored),
            "note": self.note,
            "image": self.image,
        }


@dataclass
class PartScore:
    true: int = 0
    predicted: int = 0
    matched: int = 0

    @property
    def precision(self) -> float | None:
        """None when nothing was predicted: there is nothing to be right or wrong about."""
        return self.matched / self.predicted if self.predicted else None

    @property
    def recall(self) -> float | None:
        """None when no part of this kind was on the shelf."""
        return self.matched / self.true if self.true else None


@dataclass
class ConditionScore:
    frames: int = 0  # scored frames (bright enough)
    dark: int = 0  # frames the backend would skip
    exact: int = 0  # frames with every part's count right
    abs_error: int = 0  # sum over scored frames of |predicted - true| over all parts
    brightness: list[float] = field(default_factory=list)
    parts: dict[str, PartScore] = field(default_factory=dict)

    @property
    def exact_share(self) -> float | None:
        return self.exact / self.frames if self.frames else None

    @property
    def mean_abs_error(self) -> float | None:
        return self.abs_error / self.frames if self.frames else None


def _parse_row(raw: dict[str, str], line: int) -> Row:
    try:
        row = Row(
            arrangement=int(raw["arrangement"]),
            condition=raw["condition"].strip(),
            frame=int(raw["frame"]),
            part=raw["part"].strip(),
            true=int(raw["true"]),
            predicted=int(raw["predicted"]),
            brightness=float(raw["brightness"]),
            dark={"yes": True, "no": False}[raw["dark"].strip()],
            inference_ms=float(raw.get("inferenceMs") or 0),
            ignored=int(raw.get("ignored") or 0),
            note=raw.get("note") or "",
            image=raw.get("image") or "",
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError(f"line {line}: unreadable row ({exc!r})") from exc
    if row.arrangement < 1 or row.frame < 1:
        raise ValueError(f"line {line}: arrangement and frame start at 1")
    if row.true < 0 or row.predicted < 0:
        raise ValueError(f"line {line}: counts cannot be negative")
    if not row.condition or not row.part:
        raise ValueError(f"line {line}: condition and part are required")
    return row


def read_rows(path: Path) -> list[Row]:
    """The run's CSV, validated; a bad row is refused with its line number rather than skipped."""
    with path.open(newline="") as f:
        reader = csv.DictReader(f)
        missing = set(FIELDS[:8]) - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"missing columns: {', '.join(sorted(missing))}")
        rows = [_parse_row(raw, line) for line, raw in enumerate(reader, start=2)]
    seen = set()
    for row in rows:
        key = (row.arrangement, row.condition, row.frame, row.part)
        if key in seen:
            raise ValueError(
                f"duplicate row for arrangement {row.arrangement}, {row.condition}, frame {row.frame}"
            )
        seen.add(key)
    return rows


def append_rows(path: Path, rows: list[Row]) -> None:
    new = not path.exists()
    with path.open("a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        if new:
            writer.writeheader()
        writer.writerows(row.to_csv() for row in rows)


def score(rows: list[Row]) -> dict[str, ConditionScore]:
    """Per lighting condition (in first-seen order) and over all of them (key ALL)."""
    frames: dict[tuple[int, str, int], list[Row]] = defaultdict(list)
    for row in rows:
        frames[(row.arrangement, row.condition, row.frame)].append(row)

    result: dict[str, ConditionScore] = {}
    for (_, condition, _), parts in frames.items():
        for key in (condition, ALL):
            s = result.setdefault(key, ConditionScore())
            s.brightness.append(parts[0].brightness)
            if parts[0].dark:
                s.dark += 1
                continue
            s.frames += 1
            errors = [abs(p.predicted - p.true) for p in parts]
            s.abs_error += sum(errors)
            s.exact += not any(errors)
            for p in parts:
                ps = s.parts.setdefault(p.part, PartScore())
                ps.true += p.true
                ps.predicted += p.predicted
                ps.matched += min(p.true, p.predicted)
    if ALL in result:  # keep "All conditions" last
        result[ALL] = result.pop(ALL)
    return result


def _pct(value: float | None) -> str:
    return "—" if value is None else f"{value * 100:.1f}%"


def format_tables(scores: dict[str, ConditionScore]) -> str:
    lines = [
        "| Condition | Frames scored | Too dark (not scored) | All counts right | Mean count error per frame "
        "| Brightness (0 to 255) |",
        "|---|---|---|---|---|---|",
    ]
    for name, s in scores.items():
        mae = "—" if s.mean_abs_error is None else f"{s.mean_abs_error:.2f}"
        light = f"{min(s.brightness):.0f} to {max(s.brightness):.0f}" if s.brightness else "—"
        lines.append(
            f"| {name} | {s.frames} | {s.dark} | {s.exact} ({_pct(s.exact_share)}) | {mae} | {light} |"
        )
    lines += [
        "",
        "| Condition | Part | True | Predicted | Matched | Precision | Recall |",
        "|---|---|---|---|---|---|---|",
    ]
    for name, s in scores.items():
        for part, ps in sorted(s.parts.items()):
            lines.append(
                f"| {name} | {part} | {ps.true} | {ps.predicted} | {ps.matched} "
                f"| {_pct(ps.precision)} | {_pct(ps.recall)} |"
            )
    return "\n".join(lines)


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "condition"


class Stop(Exception):
    """The person typed q."""


def _ask_count(ask: Callable[[str], str], say: Callable[[str], None], part: str, last: int | None) -> int:
    while True:
        answer = ask(f"  {part}: true count{f' [{last}]' if last is not None else ''}: ").strip().lower()
        if answer == "q":
            raise Stop
        if answer == "" and last is not None:
            return last
        if answer.isdigit():
            return int(answer)
        say("  Type a whole number (0 or more), Enter to keep the last value, or q to stop.")


def capture_session(
    *,
    camera,
    detector,
    parts: list[str],
    conditions: list[str],
    arrangements: int,
    frames: int,
    min_brightness: float,
    out_dir: Path,
    ask: Callable[[str], str] = input,
    say: Callable[[str], None] = print,
    pause: Callable[[float], None] = time.sleep,
) -> int:
    """Interactive capture; returns the number of arrangements finished. Stops cleanly on q."""
    csv_path = out_dir / "results.csv"
    (out_dir / "raw").mkdir(parents=True, exist_ok=True)
    (out_dir / "annotated").mkdir(parents=True, exist_ok=True)
    first = max((r.arrangement for r in read_rows(csv_path)), default=0) + 1 if csv_path.exists() else 1
    last: dict[str, int | None] = dict.fromkeys(parts)
    done = 0
    try:
        for arrangement in range(first, first + arrangements):
            say(f"\nArrangement {arrangement} ({done + 1} of {arrangements}): set out the parts.")
            truth = {part: _ask_count(ask, say, part, last[part]) for part in parts}
            last.update(truth)
            note = ask("  Note (optional, e.g. 'filter end-on'): ").strip()
            for condition in conditions:
                if (
                    ask(f"  Set the light to '{condition}', then press Enter (q to stop): ").strip().lower()
                    == "q"
                ):
                    raise Stop
                rows = []
                for k in range(1, frames + 1):
                    if k > 1:
                        pause(FRAME_INTERVAL_SECONDS)
                    frame = camera.capture()
                    brightness = frame_brightness(frame)
                    dark = is_too_dark(brightness, min_brightness)
                    detection = detector.detect(frame)
                    name = f"a{arrangement:02d}-{_slug(condition)}-f{k}.jpg"
                    cv2.imwrite(str(out_dir / "raw" / name), frame)
                    cv2.imwrite(str(out_dir / "annotated" / name), detection.annotated)
                    for part in parts:
                        rows.append(
                            Row(
                                arrangement,
                                condition,
                                k,
                                part,
                                truth[part],
                                detection.counts.get(part, 0),
                                brightness,
                                dark,
                                detection.inference_ms,
                                detection.ignored,
                                note,
                                name,
                            )
                        )
                    seen = ", ".join(f"{p} {detection.counts.get(p, 0)}/{truth[p]}" for p in parts)
                    say(f"    frame {k}: {seen} (brightness {brightness:.0f}{', TOO DARK' if dark else ''})")
                append_rows(csv_path, rows)
            done += 1
    except Stop:
        say("Stopped.")
    return done


def backend_running(port: int = BACKEND_PORT) -> bool:
    with socket.socket() as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def run_dir(name: str) -> Path:
    if not RUN_NAME.match(name):
        raise SystemExit("Run name: letters, digits, - and _ only")
    return BACKEND_DIR / "evaluation" / name


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    sub = parser.add_subparsers(dest="command", required=True)
    cap = sub.add_parser("capture", help="capture arrangements with known counts")
    cap.add_argument("run")
    cap.add_argument(
        "--conditions", required=True, help='comma-separated, e.g. "room light,daylight,side lamp"'
    )
    cap.add_argument("--arrangements", type=int, default=10)
    cap.add_argument("--frames", type=int, default=3, help="frames per arrangement and condition (default 3)")
    sc = sub.add_parser("score", help="print the tables for a run")
    sc.add_argument("run")
    args = parser.parse_args()
    out_dir = run_dir(args.run)

    if args.command == "score":
        csv_path = out_dir / "results.csv"
        if not csv_path.exists():
            raise SystemExit(f"No results yet: {csv_path}")
        try:
            print(format_tables(score(read_rows(csv_path))))
        except ValueError as exc:
            raise SystemExit(f"{csv_path}: {exc}") from exc
        return

    conditions = [c.strip() for c in args.conditions.split(",") if c.strip()]
    if not conditions or len(set(conditions)) != len(conditions):
        raise SystemExit("--conditions: give one or more distinct names, separated by commas")
    if args.arrangements < 1 or args.frames < 1:
        raise SystemExit("--arrangements and --frames must be at least 1")
    if backend_running():
        raise SystemExit(
            "The backend is running (port 8000). Stop it first: it holds the camera and would scan the "
            "arrangements into the live data."
        )

    # Imported here so `score` runs without loading the model or the camera.
    from app.camera import Camera
    from app.core.config import get_settings
    from app.core.exceptions import AppError
    from app.detector import Detector

    settings = get_settings()
    detector = Detector.from_path(
        settings.model_path, settings.detection_conf, settings.max_box_area_ratio, settings.max_box_side_ratio
    )
    camera = Camera(settings.camera_index, keep_open=True)
    try:
        done = capture_session(
            camera=camera,
            detector=detector,
            parts=list(detector.model.names.values()),
            conditions=conditions,
            arrangements=args.arrangements,
            frames=args.frames,
            min_brightness=settings.min_frame_brightness,
            out_dir=out_dir,
        )
    except AppError as exc:
        raise SystemExit(f"{exc.message} Results so far are kept in {out_dir}.") from exc
    finally:
        camera.release()
    print(
        f"\n{done} arrangement(s) saved in {out_dir}.\n"
        f"Score with: python -m scripts.accuracy_run score {args.run}"
    )


if __name__ == "__main__":
    main()

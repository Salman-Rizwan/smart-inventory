"""The accuracy script (Group 4, item 31): scoring on a fixed fixture, the CSV checks, and the capture
loop with fakes (no webcam, no model, no Firestore)."""

import socket

import numpy as np
import pytest

from app.core.exceptions import CameraError
from app.detector import Detection
from scripts.accuracy_run import (
    ALL,
    Row,
    append_rows,
    backend_running,
    capture_session,
    format_tables,
    read_rows,
    run_dir,
    score,
)
from tests.conftest import FakeCamera

PARTS = ["spark_plug", "petrol_filter"]


def frame(arrangement, condition, k, truth, predicted, brightness=170.0, dark=False):
    return [
        Row(arrangement, condition, k, part, truth[i], predicted[i], brightness, dark)
        for i, part in enumerate(PARTS)
    ]


# A fixed run: two conditions, the cases the report needs.
FIXTURE = [
    *frame(1, "room", 1, (4, 1), (4, 1)),  # exact
    *frame(1, "room", 2, (4, 1), (5, 1)),  # one plug counted twice
    *frame(2, "room", 1, (2, 0), (2, 0)),  # no filter on the shelf, none seen: exact
    *frame(1, "dim", 1, (4, 1), (3, 0), brightness=45.0),  # under-count of both
    *frame(2, "dim", 1, (2, 0), (2, 1), brightness=50.0),  # a filter seen that is not there
    *frame(3, "dim", 1, (1, 1), (0, 0), brightness=20.0, dark=True),  # too dark: listed, not scored
]


def test_score_per_condition():
    scores = score(FIXTURE)
    assert list(scores) == ["room", "dim", ALL]

    room = scores["room"]
    assert (room.frames, room.dark, room.exact, room.abs_error) == (3, 0, 2, 1)
    assert room.parts["spark_plug"].true == 10 and room.parts["spark_plug"].predicted == 11
    assert room.parts["spark_plug"].matched == 10
    assert room.parts["spark_plug"].precision == pytest.approx(10 / 11)
    assert room.parts["spark_plug"].recall == 1.0
    assert room.parts["petrol_filter"].precision == 1.0 and room.parts["petrol_filter"].recall == 1.0

    dim = scores["dim"]
    assert (dim.frames, dim.dark, dim.exact, dim.abs_error) == (2, 1, 0, 3)
    assert dim.parts["spark_plug"].recall == pytest.approx(5 / 6)
    assert dim.parts["petrol_filter"].matched == 0
    assert dim.parts["petrol_filter"].precision == 0.0  # one predicted, none right
    assert dim.parts["petrol_filter"].recall == 0.0
    assert dim.brightness == [45.0, 50.0, 20.0]  # the dark frame still describes the lighting


def test_score_over_all_conditions():
    total = score(FIXTURE)[ALL]
    assert (total.frames, total.dark, total.exact, total.abs_error) == (5, 1, 2, 4)
    assert total.exact_share == pytest.approx(0.4)
    assert total.mean_abs_error == pytest.approx(0.8)
    assert total.parts["spark_plug"].true == 16 and total.parts["spark_plug"].matched == 15


def test_no_prediction_and_no_truth_give_no_ratio():
    rows = frame(1, "room", 1, (0, 0), (0, 0))
    s = score(rows)["room"]
    assert s.exact == 1
    assert s.parts["petrol_filter"].precision is None
    assert s.parts["petrol_filter"].recall is None


def test_only_dark_frames_give_no_ratio():
    s = score(frame(1, "night", 1, (4, 1), (0, 0), brightness=10.0, dark=True))["night"]
    assert (s.frames, s.dark, s.exact_share, s.mean_abs_error, s.parts) == (0, 1, None, None, {})


def test_empty_run_scores_nothing():
    assert score([]) == {}


def test_tables_show_dashes_for_missing_ratios():
    text = format_tables(score(FIXTURE + frame(9, "room", 1, (0, 0), (0, 0))))
    assert "| room | 4 | 0 | 3 (75.0%) | 0.25 | 170 to 170 |" in text
    assert "| dim | 2 | 1 | 0 (0.0%) | 1.50 | 20 to 50 |" in text
    assert "| room | spark_plug | 10 | 11 | 10 | 90.9% | 100.0% |" in text
    assert "| dim | petrol_filter | 1 | 1 | 0 | 0.0% | 0.0% |" in text
    only_dark = format_tables(score(frame(1, "night", 1, (4, 1), (0, 0), 10.0, True)))
    assert "| night | 0 | 1 | 0 (—) | — | 10 to 10 |" in only_dark


def test_csv_round_trip(tmp_path):
    path = tmp_path / "results.csv"
    append_rows(path, FIXTURE[:4])
    append_rows(path, FIXTURE[4:])  # the header is written once
    assert read_rows(path) == FIXTURE
    assert path.read_text().count("arrangement,") == 1


@pytest.mark.parametrize(
    ("change", "message"),
    [
        (("true", "-1"), "negative"),
        (("predicted", "x"), "unreadable"),
        (("dark", "maybe"), "unreadable"),
        (("frame", "0"), "start at 1"),
        (("part", " "), "required"),
    ],
)
def test_bad_rows_are_refused_with_their_line(tmp_path, change, message):
    path = tmp_path / "results.csv"
    append_rows(path, FIXTURE[:2])
    lines = path.read_text().splitlines()
    header = lines[0].split(",")
    cells = lines[2].split(",")
    cells[header.index(change[0])] = change[1]
    lines[2] = ",".join(cells)
    path.write_text("\n".join(lines) + "\n")
    with pytest.raises(ValueError, match=f"line 3: .*{message}"):
        read_rows(path)


def test_missing_columns_and_duplicates_are_refused(tmp_path):
    path = tmp_path / "a.csv"
    path.write_text("arrangement,condition\n1,room\n")
    with pytest.raises(ValueError, match="missing columns"):
        read_rows(path)
    path = tmp_path / "b.csv"
    append_rows(path, FIXTURE[:2] + FIXTURE[:1])
    with pytest.raises(ValueError, match="duplicate"):
        read_rows(path)


def test_run_names_are_checked():
    assert run_dir("nov16_a").name == "nov16_a"
    with pytest.raises(SystemExit):
        run_dir("../escape")


def test_backend_running_sees_a_listening_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        s.listen()
        port = s.getsockname()[1]
        assert backend_running(port)
    assert not backend_running(port)


class ScriptedDetector:
    """Returns the next counts in the list for each frame."""

    def __init__(self, counts):
        self.counts = list(counts)
        self.calls = 0

    def detect(self, frame):
        counts = self.counts[self.calls]
        self.calls += 1
        return Detection(counts, 30.0, np.zeros((10, 10, 3), dtype=np.uint8), ignored=0)


def answers(*values):
    it = iter(values)
    prompts = []

    def ask(prompt):
        prompts.append(prompt)
        return next(it)

    ask.prompts = prompts
    return ask


def session(tmp_path, ask, detector, camera=None, arrangements=2, conditions=("room", "dim"), frames=2):
    said = []
    done = capture_session(
        camera=camera or FakeCamera(),
        detector=detector,
        parts=PARTS,
        conditions=list(conditions),
        arrangements=arrangements,
        frames=frames,
        min_brightness=40,
        out_dir=tmp_path,
        ask=ask,
        say=said.append,
        pause=lambda s: None,
    )
    return done, said


def test_capture_records_every_frame_with_its_truth(tmp_path):
    seen = {"spark_plug": 4, "petrol_filter": 1}
    detector = ScriptedDetector([seen] * 8)
    # Arrangement 1: 4 and 1; arrangement 2: Enter keeps 4, filter becomes 0.
    ask = answers("4", "1", "", "", "", "", "0", "filter removed", "", "")
    done, said = session(tmp_path, ask, detector)

    assert done == 2
    rows = read_rows(tmp_path / "results.csv")
    assert len(rows) == 2 * 2 * 2 * 2  # arrangements x conditions x frames x parts
    second = [r for r in rows if r.arrangement == 2 and r.part == "petrol_filter"]
    assert {(r.true, r.predicted, r.note) for r in second} == {(0, 1, "filter removed")}
    assert all(r.brightness == 128.0 and not r.dark for r in rows)
    assert (tmp_path / "raw" / "a01-room-f1.jpg").exists()
    assert (tmp_path / "annotated" / "a02-dim-f2.jpg").exists()
    assert ask.prompts[5] == "  spark_plug: true count [4]: "
    assert any("petrol_filter 1/0" in line for line in said)


def test_capture_continues_numbering_and_marks_dark_frames(tmp_path):
    detector = ScriptedDetector([{"spark_plug": 0, "petrol_filter": 0}] * 4)
    session(tmp_path, answers("4", "1", "", ""), detector, arrangements=1, conditions=("room",))
    session(
        tmp_path,
        answers("4", "1", "", ""),
        detector,
        camera=FakeCamera(brightness=10),
        arrangements=1,
        conditions=("night",),
    )
    rows = read_rows(tmp_path / "results.csv")
    assert sorted({r.arrangement for r in rows}) == [1, 2]
    assert all(r.dark for r in rows if r.arrangement == 2)
    assert score(rows)["night"].dark == 2


def test_capture_asks_again_for_a_bad_count_and_stops_on_q(tmp_path):
    detector = ScriptedDetector([{"spark_plug": 4, "petrol_filter": 1}] * 2)
    ask = answers("four", "", "4", "1", "", "", "q")  # no last value yet, so Enter is not accepted
    done, said = session(tmp_path, ask, detector)
    assert done == 0  # q at the second condition: the arrangement is not finished
    assert len(read_rows(tmp_path / "results.csv")) == 4  # but the frames taken under "room" are kept
    assert said.count("  Type a whole number (0 or more), Enter to keep the last value, or q to stop.") == 2
    assert "Stopped." in said


def test_capture_camera_failure_keeps_earlier_rows(tmp_path):
    class FailingSecond(FakeCamera):
        def capture(self):
            if self.captures >= 2:
                raise CameraError()
            return super().capture()

    detector = ScriptedDetector([{"spark_plug": 4, "petrol_filter": 1}] * 4)
    with pytest.raises(CameraError):
        session(tmp_path, answers("4", "1", "", "", ""), detector, camera=FailingSecond())
    rows = read_rows(tmp_path / "results.csv")
    assert {r.condition for r in rows} == {"room"} and len(rows) == 4

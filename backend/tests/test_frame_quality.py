import numpy as np
import pytest

from app.clock import has_lasted, started_at, utc_now
from app.frame_quality import frame_brightness, is_too_dark


@pytest.mark.parametrize("level", [0, 37, 128, 255])
def test_a_uniform_colour_frame_has_its_own_level_as_brightness(level):
    assert frame_brightness(np.full((4, 6, 3), level, dtype=np.uint8)) == level


def test_a_greyscale_frame_works_too():
    assert frame_brightness(np.full((4, 4), 90, dtype=np.uint8)) == 90


def test_brightness_is_the_mean_rounded_to_one_decimal():
    frame = np.zeros((2, 2, 3), dtype=np.uint8)
    frame[0, 0] = 255  # one white pixel in four
    assert frame_brightness(frame) == 63.8


def test_an_empty_frame_is_refused():
    with pytest.raises(ValueError):
        frame_brightness(np.zeros((0, 0, 3), dtype=np.uint8))


def test_exactly_at_the_minimum_is_bright_enough():
    assert is_too_dark(39.9, 40) is True
    assert is_too_dark(40, 40) is False
    assert is_too_dark(0, 0) is False  # a minimum of 0 turns the check off


def test_the_clock_is_timezone_aware_utc():
    now = utc_now()
    assert now.tzinfo is not None and now.utcoffset().total_seconds() == 0


def test_started_at_never_trusts_a_missing_naive_or_future_time():
    from datetime import datetime, timedelta

    now = utc_now()
    assert started_at(None, now) is None
    assert started_at("12:00", now) is None
    assert started_at(datetime(2026, 1, 1), now) is None
    assert started_at(now + timedelta(hours=1), now) == now
    assert started_at(now - timedelta(minutes=5), now) == now - timedelta(minutes=5)
    assert has_lasted(now - timedelta(seconds=60), now, 60) and not has_lasted(
        now - timedelta(seconds=59), now, 60
    )

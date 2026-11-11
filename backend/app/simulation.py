"""Simulated parts, for live testing only (SIMULATED_PARTS in .env, empty by default).

A simulated part is added to every scan's counts as if the camera had counted it, so the real pipeline
(reconciliation, alerts, orders, Cancel, the dealer's view) can be tested live on a made-up part without
touching real stock or real orders. Its name must start with "zz_", the prefix every test cleanup removes,
and it can never change the count of a part the model detects.
"""

import re

PREFIX = "zz_"
_ENTRY = re.compile(r"^(zz_[a-z0-9_]+):(\d{1,6})$")


def parse_simulated_parts(text: str) -> dict[str, int]:
    """'zz_part:0,zz_other:3' -> {'zz_part': 0, 'zz_other': 3}. Empty text means none. Pure."""
    parts: dict[str, int] = {}
    for raw in text.split(","):
        entry = raw.strip()
        if not entry:
            continue
        match = _ENTRY.match(entry)
        if not match:
            raise ValueError(
                f"SIMULATED_PARTS entry {entry!r} is not valid: write name:count, where the name starts "
                f"with {PREFIX!r} (lower case, digits, underscores) and the count is a whole number, "
                "for example zz_part:0"
            )
        name, count = match.group(1), int(match.group(2))
        if name in parts:
            raise ValueError(f"SIMULATED_PARTS names {name!r} twice")
        parts[name] = count
    return parts


def with_simulated(detected: dict[str, int], simulated: dict[str, int]) -> dict[str, int]:
    """The camera's counts plus the simulated parts. A part the model counts always keeps its own count."""
    return {**{name: n for name, n in simulated.items() if name not in detected}, **detected}

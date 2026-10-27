"""POS reconciliation: compare what the camera counts with what the POS records say."""

from dataclasses import dataclass

MATCHED = "Matched"
MISMATCH = "Mismatch"


@dataclass(frozen=True)
class Reconciliation:
    visual: int
    pos: int
    status: str

    @property
    def difference(self) -> int:
        """Shelf minus POS: negative means the records claim stock that is not on the shelf."""
        return self.visual - self.pos


def status_for(visual: int, pos: int) -> str:
    return MATCHED if visual == pos else MISMATCH


def reconcile(counts: dict[str, int], pos_counts: dict[str, int]) -> dict[str, Reconciliation]:
    """Compare each counted part with its POS figure. Parts with no POS record are left out."""
    return {
        part: Reconciliation(visual, pos_counts[part], status_for(visual, pos_counts[part]))
        for part, visual in counts.items()
        if part in pos_counts
    }

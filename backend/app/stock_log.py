"""Stock change log entries written by the backend scripts (stock_movements)."""

RESET = "Reset"


def reset_movement(product_id: str, current: dict, new_pos: int, by: str) -> dict | None:
    """The log entry for a script setting a POS count directly, or None when the count is unchanged.

    Pure: the caller adds the server timestamp (`at`), writes the entry and sets the product's
    posCount and lastMovementId in the same batch, so the log keeps agreeing with the POS. Reset
    entries are left out of the sales and shrinkage figures; the browser can never write one.
    """
    before = current.get("posCount")
    before = before if isinstance(before, int) and not isinstance(before, bool) else 0
    if before == new_pos:
        return None
    return {
        "product": product_id,
        "type": RESET,
        "change": new_pos - before,
        "posBefore": before,
        "posAfter": new_pos,
        "unitCost": current.get("unitCost"),
        "unitPrice": current.get("unitPrice"),
        "by": by,
    }

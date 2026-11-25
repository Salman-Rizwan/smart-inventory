import threading
from collections.abc import Callable
from datetime import datetime
from typing import Protocol

from app.clock import utc_now


class RoleSource(Protocol):
    def get_role(self, uid: str) -> str | None: ...


class RoleChecker:
    """The signed-in user's role (users/{uid}.role), as the Firestore rules see it.

    Each answer is kept for `ttl_seconds`: the dashboard fetches the shelf image after every scan, and
    one database read per image would cost about 2,900 reads a day per open dashboard on the free plan.
    The trade-off: a role change reaches the backend within that time, not at once.
    """

    def __init__(self, users: RoleSource, clock: Callable[[], datetime] = utc_now, ttl_seconds: int = 300):
        self.users = users
        self.clock = clock
        self.ttl_seconds = ttl_seconds
        self._cache: dict[str, tuple[str | None, datetime]] = {}
        self._lock = threading.Lock()

    def role_of(self, uid: str) -> str | None:
        """Raises StorageError when the profile cannot be read; a failed read is never cached."""
        now = self.clock()
        with self._lock:
            cached = self._cache.get(uid)
        if cached is not None and (now - cached[1]).total_seconds() < self.ttl_seconds:
            return cached[0]
        role = self.users.get_role(uid)
        with self._lock:
            self._cache[uid] = (role, now)
        return role

"""The role lookup behind the shopkeeper-only endpoints: cached for a while, never caching a failure."""

import pytest

from app.core.exceptions import StorageError
from app.services.role_checker import RoleChecker
from tests.conftest import FakeClock, FakeUsers


def test_a_role_is_read_once_and_kept_for_the_cache_time():
    users, clock = FakeUsers({"u1": "shopkeeper"}), FakeClock()
    roles = RoleChecker(users, clock, ttl_seconds=300)
    assert roles.role_of("u1") == "shopkeeper"
    clock.advance(299)
    assert roles.role_of("u1") == "shopkeeper"
    assert users.reads == 1


def test_a_changed_role_is_seen_once_the_cache_time_has_passed():
    users, clock = FakeUsers({"u1": "shopkeeper"}), FakeClock()
    roles = RoleChecker(users, clock, ttl_seconds=300)
    roles.role_of("u1")
    users.roles["u1"] = "dealer"
    clock.advance(300)
    assert roles.role_of("u1") == "dealer"
    assert users.reads == 2


def test_each_user_is_cached_separately_and_a_missing_profile_has_no_role():
    users = FakeUsers({"u1": "shopkeeper"})
    roles = RoleChecker(users, FakeClock())
    assert (roles.role_of("u1"), roles.role_of("u2")) == ("shopkeeper", None)
    assert users.reads == 2


def test_a_failed_read_is_raised_and_not_cached():
    users = FakeUsers({"u1": "shopkeeper"}, fail=True)
    roles = RoleChecker(users, FakeClock())
    with pytest.raises(StorageError):
        roles.role_of("u1")
    users.fail = False
    assert roles.role_of("u1") == "shopkeeper"

from fastapi import Depends, Request

from app.core.exceptions import ForbiddenError
from app.core.security import get_current_user
from app.services.role_checker import RoleChecker
from app.services.scan_service import ScanService
from app.services.snapshot_store import SnapshotStore


def get_scan_service(request: Request) -> ScanService:
    return request.app.state.scan_service


def get_snapshot_store(request: Request) -> SnapshotStore:
    return request.app.state.snapshot_store


def get_role_checker(request: Request) -> RoleChecker:
    return request.app.state.role_checker


def require_shopkeeper(
    user: dict = Depends(get_current_user), roles: RoleChecker = Depends(get_role_checker)
) -> dict:
    """The camera and the shelf photo belong to the shop: a dealer's valid token is refused (403)."""
    if roles.role_of(user["uid"]) != "shopkeeper":
        raise ForbiddenError()
    return user

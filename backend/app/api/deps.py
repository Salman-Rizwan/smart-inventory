from fastapi import Request

from app.services.scan_service import ScanService
from app.services.snapshot_store import SnapshotStore


def get_scan_service(request: Request) -> ScanService:
    return request.app.state.scan_service


def get_snapshot_store(request: Request) -> SnapshotStore:
    return request.app.state.snapshot_store

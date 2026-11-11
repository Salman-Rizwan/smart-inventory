from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse

from app.api.deps import get_scan_service, get_snapshot_store, require_shopkeeper
from app.schemas.scan import ScanResponse
from app.services.scan_service import ScanService
from app.services.snapshot_store import SnapshotStore

# Shopkeeper only (M10): the dealer may sign in, but the camera and the shelf photo are the shop's.
router = APIRouter(tags=["scan"], dependencies=[Depends(require_shopkeeper)])


@router.post("/scan", response_model=ScanResponse)
def scan(service: ScanService = Depends(get_scan_service)) -> ScanResponse:
    """Capture a frame, count the parts, save to Firestore and return the counts."""
    return service.scan()


@router.get("/snapshot/latest.jpg", response_class=FileResponse)
def latest_snapshot(store: SnapshotStore = Depends(get_snapshot_store)) -> FileResponse:
    return FileResponse(store.latest(), media_type="image/jpeg", headers={"Cache-Control": "no-store"})

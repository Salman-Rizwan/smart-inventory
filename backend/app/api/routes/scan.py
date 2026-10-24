from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse

from app.api.deps import get_scan_service, get_snapshot_store
from app.core.security import get_current_user
from app.schemas.scan import ScanResponse
from app.services.scan_service import ScanService
from app.services.snapshot_store import SnapshotStore

router = APIRouter(tags=["scan"], dependencies=[Depends(get_current_user)])


@router.post("/scan", response_model=ScanResponse)
def scan(service: ScanService = Depends(get_scan_service)) -> ScanResponse:
    """Capture a frame, count the parts, save to Firestore and return the counts."""
    return service.scan()


@router.get("/snapshot/latest.jpg", response_class=FileResponse)
def latest_snapshot(store: SnapshotStore = Depends(get_snapshot_store)) -> FileResponse:
    return FileResponse(store.latest(), media_type="image/jpeg", headers={"Cache-Control": "no-store"})

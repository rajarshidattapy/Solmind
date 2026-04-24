from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from app.models.schemas import KVSnapshotCreate
from app.services.kv_memory_service import KVMemoryService
from app.core.auth_dependencies import get_wallet_address
from app.db import store

router = APIRouter()
_svc = KVMemoryService()


@router.post("/snapshot")
async def create_snapshot(
    body: KVSnapshotCreate,
    wallet_address: Optional[str] = Depends(get_wallet_address),
):
    try:
        return _svc.create_snapshot(body.agent_id, body.chat_id, wallet_address)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history/{agent_id}")
async def get_history(agent_id: str):
    return _svc.get_history(agent_id)


@router.get("/restore/{agent_id}")
async def restore_latest(agent_id: str, snapshot_id: Optional[str] = None):
    result = _svc.restore_snapshot(agent_id, snapshot_id)
    if result is None:
        raise HTTPException(status_code=404, detail="No snapshots found for this agent")
    return result


@router.post("/rollback/{snapshot_id}")
async def rollback(snapshot_id: str):
    raw = store.kv_snapshots.get(snapshot_id)
    if not raw:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    result = _svc.restore_snapshot(raw["agent_id"], snapshot_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Snapshot data missing")
    return result


@router.get("/verify/{snapshot_id}")
async def verify(snapshot_id: str):
    return _svc.verify_snapshot(snapshot_id)

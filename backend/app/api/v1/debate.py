from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime
import uuid

from app.models.schemas import DebateSessionCreate, DebateStatus
from app.services.debate_service import DebateService
from app.core.auth_dependencies import get_wallet_address
from app.db import store

router = APIRouter()


@router.post("/start")
async def start_debate(
    session: DebateSessionCreate,
    wallet_address: Optional[str] = Depends(get_wallet_address),
):
    if len(session.agents) < 2:
        raise HTTPException(status_code=400, detail="At least 2 agents required")
    if not (1 <= session.quorum <= len(session.agents)):
        raise HTTPException(status_code=400, detail="Quorum must be between 1 and agent count")
    if not (1 <= session.rounds <= 10):
        raise HTTPException(status_code=400, detail="Rounds must be between 1 and 10")

    debate_id = f"debate-{uuid.uuid4().hex[:12]}"
    store.debates[debate_id] = {
        "id": debate_id,
        "task": session.task,
        "agents": session.agents,
        "mechanism": session.mechanism.value,
        "rounds": session.rounds,
        "quorum": session.quorum,
        "payment_locked": session.payment_locked,
        "status": DebateStatus.PENDING.value,
        "transcript": [],
        "transcript_hash": None,
        "final_decision": None,
        "quorum_reached": False,
        "creator_wallet": wallet_address,
        "created_at": datetime.now().isoformat(),
        "finalized_at": None,
        "on_chain_tx": None,
    }

    service = DebateService()

    async def stream():
        async for chunk in service.run_stream(debate_id):
            yield chunk

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Debate-ID": debate_id,
        },
    )


@router.get("/")
async def list_debates(wallet_address: Optional[str] = Depends(get_wallet_address)):
    debates = [
        {k: v for k, v in d.items() if k != "transcript"}
        for d in store.debates.values()
        if not wallet_address or d.get("creator_wallet") == wallet_address
    ]
    return sorted(debates, key=lambda d: d.get("created_at", ""), reverse=True)


@router.get("/{debate_id}")
async def get_debate(debate_id: str):
    data = store.debates.get(debate_id)
    if not data:
        raise HTTPException(status_code=404, detail="Debate not found")
    return data


@router.get("/{debate_id}/receipt")
async def get_receipt(debate_id: str):
    data = store.debates.get(debate_id)
    if not data:
        raise HTTPException(status_code=404, detail="Debate not found")
    if data.get("status") != DebateStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Debate not yet completed")
    return {
        "debate_id": debate_id,
        "task": data.get("task"),
        "final_decision": data.get("final_decision"),
        "quorum_reached": data.get("quorum_reached"),
        "transcript_hash": data.get("transcript_hash"),
        "agents": data.get("agents", []),
        "rounds": data.get("rounds"),
        "mechanism": data.get("mechanism"),
        "transcript": data.get("transcript", []),
        "finalized_at": data.get("finalized_at"),
        "on_chain_tx": data.get("on_chain_tx"),
    }

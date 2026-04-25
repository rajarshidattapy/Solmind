from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


# ── Existing ─────────────────────────────────────────────────────────────────

class ChatResponse(Dict[str, Any]):
    pass


# ── Debate ────────────────────────────────────────────────────────────────────

DebateEvent = Dict[str, Any]


@dataclass
class TranscriptEntry:
    round: int
    agent: str
    agent_name: str
    role: str
    content: str


@dataclass
class DebateResult:
    debate_id: str
    final_decision: str
    quorum_reached: bool
    transcript_hash: str
    transcript: List[TranscriptEntry] = field(default_factory=list)

    @property
    def approved(self) -> bool:
        return self.final_decision == "APPROVED"

    def __repr__(self) -> str:
        status = "✓ APPROVED" if self.approved else "✗ REJECTED"
        quorum = "quorum reached" if self.quorum_reached else "no quorum"
        return (
            f"DebateResult({status}, {quorum}, "
            f"rounds={len(set(e.round for e in self.transcript))}, "
            f"hash={self.transcript_hash[:12]}…)"
        )


# ── Memory ────────────────────────────────────────────────────────────────────

@dataclass
class SnapshotResult:
    id: str
    agent_id: str
    chat_id: str
    storage_hash: str
    compression_ratio: float
    original_size_bytes: int
    compressed_size_bytes: int
    bits_per_token: float
    model: str
    provider: str
    message_count: int
    verified: bool
    created_at: str
    wallet_address: Optional[str] = None
    on_chain_tx: Optional[str] = None
    filecoin_cid: Optional[str] = None
    filecoin_gateway_url: Optional[str] = None

    @classmethod
    def _from(cls, d: dict) -> "SnapshotResult":
        return cls(
            id=d.get("id", ""),
            agent_id=d.get("agent_id", ""),
            chat_id=d.get("chat_id", ""),
            storage_hash=d.get("storage_hash", ""),
            compression_ratio=d.get("compression_ratio", 0.0),
            original_size_bytes=d.get("original_size_bytes", 0),
            compressed_size_bytes=d.get("compressed_size_bytes", 0),
            bits_per_token=d.get("bits_per_token", 0.0),
            model=d.get("model", ""),
            provider=d.get("provider", ""),
            message_count=d.get("message_count", 0),
            verified=d.get("verified", False),
            created_at=d.get("created_at", ""),
            wallet_address=d.get("wallet_address"),
            on_chain_tx=d.get("on_chain_tx"),
            filecoin_cid=d.get("filecoin_cid"),
            filecoin_gateway_url=d.get("filecoin_gateway_url"),
        )

    def __repr__(self) -> str:
        fc = f", CID={self.filecoin_cid[:12]}…" if self.filecoin_cid else ""
        return (
            f"SnapshotResult(id={self.id}, "
            f"msgs={self.message_count}, "
            f"ratio={self.compression_ratio}x, "
            f"bpt={self.bits_per_token}{fc})"
        )


@dataclass
class RestoredMessage:
    role: str
    content: str


@dataclass
class RestoreResult:
    snapshot: SnapshotResult
    messages: List[RestoredMessage]
    restore_verified: bool

    @classmethod
    def _from(cls, d: dict) -> "RestoreResult":
        snap = SnapshotResult._from(d.get("snapshot", {}))
        msgs = [
            RestoredMessage(role=m.get("role", ""), content=m.get("content", ""))
            for m in d.get("messages", [])
        ]
        return cls(
            snapshot=snap,
            messages=msgs,
            restore_verified=d.get("restore_verified", False),
        )

    def __repr__(self) -> str:
        ok = "✓" if self.restore_verified else "✗ hash mismatch"
        return f"RestoreResult({ok}, {len(self.messages)} messages from {self.snapshot.id})"

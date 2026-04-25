"""
SolMind Persistent Memory SDK — TurboQuant-inspired verifiable agent memory.

Usage:
    from solmind import PersistentMemory

    mem = PersistentMemory(agent_id="oracle-agent")

    snap = mem.snapshot(chat_id="chat-123")
    print(snap.compression_ratio)    # e.g. 4.2
    print(snap.bits_per_token)       # e.g. 3.8
    print(snap.storage_hash)         # SHA-256
    print(snap.filecoin_cid)         # IPFS CID if Filecoin key is configured

    restored = mem.restore()         # latest snapshot
    # or: mem.restore(snapshot_id="snap-abc123")

    verify = mem.verify(snap.id)
    print(verify["verified"])        # True / False

    mem.rollback("snap-abc123")      # restore a specific older state
"""

from __future__ import annotations
from typing import List, Optional
from .client import SolmindClient
from .types import SnapshotResult, RestoreResult


class PersistentMemory:
    """
    Manages verifiable KV memory snapshots for a SolMind agent.

    Snapshots compress the full conversation state with zlib (analogous to
    TurboQuant quantization), store a SHA-256 content hash, and optionally
    pin the compressed blob to Filecoin via Lighthouse for permanent storage.

    Parameters
    ----------
    agent_id      : The agent whose memory you are managing.
    wallet_address: Solana wallet address for authentication.
    base_url      : SolMind backend URL.
    """

    def __init__(
        self,
        agent_id: str,
        wallet_address: str = "",
        base_url: str = "http://localhost:8000",
    ):
        self.agent_id = agent_id
        self._client = SolmindClient(wallet_address, base_url)

    def snapshot(self, chat_id: str) -> SnapshotResult:
        """
        Compress and hash the current conversation state.
        If LIGHTHOUSE_API_KEY is configured on the backend, the compressed
        blob is also pinned to Filecoin and the CID is returned.
        """
        data = self._client.post(
            "/api/v1/memory/snapshot",
            {"agent_id": self.agent_id, "chat_id": chat_id},
        )
        return SnapshotResult._from(data)

    def history(self) -> List[SnapshotResult]:
        """Return all snapshots for this agent, newest first."""
        items = self._client.get(f"/api/v1/memory/history/{self.agent_id}")
        return [SnapshotResult._from(d) for d in (items or [])]

    def restore(self, snapshot_id: Optional[str] = None) -> RestoreResult:
        """
        Decompress and return the conversation messages from a snapshot.
        Defaults to the latest snapshot. Hash integrity is verified on restore.
        """
        path = f"/api/v1/memory/restore/{self.agent_id}"
        if snapshot_id:
            path += f"?snapshot_id={snapshot_id}"
        data = self._client.get(path)
        return RestoreResult._from(data)

    def rollback(self, snapshot_id: str) -> RestoreResult:
        """Restore a specific earlier snapshot by ID."""
        data = self._client.post(f"/api/v1/memory/rollback/{snapshot_id}", {})
        return RestoreResult._from(data)

    def verify(self, snapshot_id: str) -> dict:
        """
        Re-derive the SHA-256 hash of the stored compressed blob and compare
        it against the recorded hash. Returns verified=True if they match.
        """
        return self._client.get(f"/api/v1/memory/verify/{snapshot_id}")

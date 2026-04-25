"""
KV Memory Service — TurboQuant-inspired persistent agent memory.

Snapshots conversation state, compresses it (analogous to KV cache quantization),
hashes the result, and provides restore/verify primitives.

Real KV cache access requires model-side support (not available via OpenRouter).
This layer builds the infrastructure that would store actual KV tensors when
models expose them, and works today with conversation-state compression.
"""

import base64
import hashlib
import json
import logging
import uuid
import zlib
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.db import store
from app.services.filecoin_service import FilecoinService

logger = logging.getLogger(__name__)


_ESTIMATED_CHARS_PER_TOKEN = 4  # rough approximation for token counting


class KVMemoryService:

    def create_snapshot(
        self,
        agent_id: str,
        chat_id: str,
        wallet_address: Optional[str] = None,
    ) -> Dict[str, Any]:
        messages = store.messages.get(chat_id, [])
        if not messages:
            raise ValueError("No messages in this chat to snapshot")

        chat_meta = store.chats.get(chat_id, {})
        agent_info = self._get_agent_info(agent_id)

        # Serialize full conversation
        payload = json.dumps({
            "agent_id": agent_id,
            "chat_id": chat_id,
            "messages": messages,
            "snapshot_meta": {
                "message_count": len(messages),
                "chat_created_at": chat_meta.get("timestamp", ""),
                "model": agent_info["model"],
                "provider": agent_info["provider"],
            },
        }, separators=(",", ":")).encode("utf-8")

        # zlib compress at max level — analogous to TurboQuant quantization compression
        compressed = zlib.compress(payload, level=9)

        original_bytes = len(payload)
        compressed_bytes = len(compressed)
        compression_ratio = round(original_bytes / max(compressed_bytes, 1), 2)

        # bits per token (FP16 KV cache baseline = 16 bits; we measure against that)
        estimated_tokens = max(original_bytes // _ESTIMATED_CHARS_PER_TOKEN, 1)
        bits_per_token = round((compressed_bytes * 8) / estimated_tokens, 2)

        storage_hash = hashlib.sha256(compressed).hexdigest()
        encoded = base64.b64encode(compressed).decode("ascii")

        snapshot_id = f"snap-{uuid.uuid4().hex[:12]}"

        # Attempt Filecoin upload (non-blocking — failure does not abort snapshot)
        filecoin_cid = None
        filecoin_gateway_url = None
        _fc = FilecoinService()
        if _fc.is_available():
            try:
                filecoin_cid = _fc.upload(compressed, filename=f"{snapshot_id}.bin")
                filecoin_gateway_url = FilecoinService.gateway_url(filecoin_cid)
                logger.info("Snapshot %s pinned to Filecoin CID %s", snapshot_id, filecoin_cid)
            except Exception as exc:
                logger.warning("Filecoin upload failed for %s: %s", snapshot_id, exc)

        record = {
            "id": snapshot_id,
            "agent_id": agent_id,
            "chat_id": chat_id,
            "storage_hash": storage_hash,
            "compression_ratio": compression_ratio,
            "original_size_bytes": original_bytes,
            "compressed_size_bytes": compressed_bytes,
            "bits_per_token": bits_per_token,
            "model": agent_info["model"],
            "provider": agent_info["provider"],
            "message_count": len(messages),
            "verified": True,
            "wallet_address": wallet_address,
            "created_at": datetime.now().isoformat(),
            "on_chain_tx": None,
            "filecoin_cid": filecoin_cid,
            "filecoin_gateway_url": filecoin_gateway_url,
            "_data": encoded,  # internal only — not returned in API responses
        }
        store.kv_snapshots[snapshot_id] = record
        return self._public(record)

    def restore_snapshot(
        self,
        agent_id: str,
        snapshot_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        snapshots = self.get_history(agent_id)
        if not snapshots:
            return None

        target_meta = (
            next((s for s in snapshots if s["id"] == snapshot_id), None)
            if snapshot_id
            else snapshots[0]
        )
        if not target_meta:
            return None

        raw = store.kv_snapshots[target_meta["id"]]
        encoded = raw.get("_data", "")
        if not encoded:
            return None

        compressed = base64.b64decode(encoded.encode("ascii"))
        actual_hash = hashlib.sha256(compressed).hexdigest()
        restore_verified = actual_hash == raw["storage_hash"]

        payload = json.loads(zlib.decompress(compressed).decode("utf-8"))

        return {
            "snapshot": target_meta,
            "messages": payload.get("messages", []),
            "restore_verified": restore_verified,
        }

    def verify_snapshot(self, snapshot_id: str) -> Dict[str, Any]:
        raw = store.kv_snapshots.get(snapshot_id)
        if not raw:
            return {"snapshot_id": snapshot_id, "verified": False, "error": "Snapshot not found"}

        compressed = base64.b64decode(raw["_data"].encode("ascii"))
        actual_hash = hashlib.sha256(compressed).hexdigest()
        verified = actual_hash == raw["storage_hash"]

        return {
            "snapshot_id": snapshot_id,
            "expected_hash": raw["storage_hash"],
            "actual_hash": actual_hash,
            "verified": verified,
        }

    def get_history(self, agent_id: str) -> List[Dict[str, Any]]:
        result = [
            self._public(s)
            for s in store.kv_snapshots.values()
            if s["agent_id"] == agent_id
        ]
        return sorted(result, key=lambda s: s.get("created_at", ""), reverse=True)

    # ── helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _public(record: Dict) -> Dict:
        return {k: v for k, v in record.items() if not k.startswith("_")}

    @staticmethod
    def _get_agent_info(agent_id: str) -> Dict[str, str]:
        from app.services.agent_service import DEFAULT_AGENTS
        if agent_id in DEFAULT_AGENTS:
            a = DEFAULT_AGENTS[agent_id]
            return {"model": a.model or agent_id, "provider": a.platform}
        data = store.agents.get(agent_id)
        if data:
            return {"model": data.get("model") or agent_id, "provider": data.get("platform") or "OpenRouter"}
        return {"model": agent_id, "provider": "OpenRouter"}

from typing import List, Dict, Optional
import logging
from app.db.supermemory import get_client

logger = logging.getLogger(__name__)

MEMORY_LIMITS = {"Small": 3, "Medium": 5, "Large": 10}


class MemoryService:
    def _is_available(self) -> bool:
        from app.core.config import settings
        if not settings.SUPERMEMORY_API_KEY:
            return False
        try:
            import supermemory  # noqa: F401
            return True
        except ImportError:
            return False

    def _space(self, chat_id: str, capsule_id: Optional[str]) -> str:
        return f"capsule_{capsule_id}" if capsule_id else f"chat_{chat_id}"

    def _parse(self, r) -> Dict:
        if isinstance(r, dict):
            return {"memory": r.get("content", ""), "metadata": r.get("metadata", {}), "id": r.get("id")}
        return {"memory": getattr(r, "content", ""), "metadata": getattr(r, "metadata", {}), "id": getattr(r, "id", None)}

    def get_chat_memories(
        self,
        agent_id: str,
        chat_id: str,
        query: str,
        memory_size: str = "Medium",
        limit: Optional[int] = None,
        capsule_id: Optional[str] = None,
    ) -> List[Dict]:
        if not query.strip():
            return []
        limit = limit or MEMORY_LIMITS.get(memory_size, 5)
        try:
            results = get_client().memory.search(
                q=query, spaces=[self._space(chat_id, capsule_id)], limit=limit
            )
            return [self._parse(r) for r in results]
        except Exception as e:
            logger.warning(f"Memory search failed: {e}")
            return []

    def store_chat_memory(
        self,
        agent_id: str,
        chat_id: str,
        messages: List[Dict[str, str]],
        capsule_id: Optional[str] = None,
    ) -> bool:
        if len(messages) < 2:
            return False
        content = "\n".join(
            f"{m['role'].capitalize()}: {m['content']}" for m in messages[-2:]
        )
        try:
            get_client().memory.add(
                content=content,
                spaces=[self._space(chat_id, capsule_id)],
                metadata={"chat_id": chat_id, "agent_id": agent_id},
            )
            return True
        except Exception as e:
            logger.warning(f"Memory add failed: {e}")
            return False

    def format_memory_context(self, memories: List[Dict]) -> str:
        lines = [m["memory"] for m in memories if m.get("memory")]
        return "\n".join(f"- {l}" for l in lines)

    def get_all_chat_memories(
        self, agent_id: str, chat_id: str, capsule_id: Optional[str] = None
    ) -> List[Dict]:
        try:
            results = get_client().memory.search(
                q="conversation", spaces=[self._space(chat_id, capsule_id)], limit=100
            )
            return [self._parse(r) for r in results]
        except Exception as e:
            logger.warning(f"Memory list failed: {e}")
            return []

    def delete_chat_memories(self, agent_id: str, chat_id: str) -> bool:
        memories = self.get_all_chat_memories(agent_id, chat_id)
        client = get_client()
        for mem in memories:
            if mem.get("id"):
                try:
                    client.memory.delete(mem["id"])
                except Exception:
                    pass
        return True

from typing import List, Dict, Optional, AsyncGenerator
from app.core.config import settings
from app.models.schemas import Agent, LLMResponse
from app.services.memory_service import MemoryService

import httpx
import json
import logging

logger = logging.getLogger(__name__)


def truncate_to_words(text: str, max_words: int = 100) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + "..."


class LLMService:
    def __init__(self):
        self.openrouter_base = "https://openrouter.ai/api/v1"
        self.memory_service = MemoryService()

    # ---------------------------------------------------------------------
    # PUBLIC NON-STREAM API
    # ---------------------------------------------------------------------

    async def get_completion(
        self,
        agent_id: str,
        messages: List[Dict[str, str]],
        agent_config: Agent,
        chat_id: Optional[str] = None,
        memory_size: str = "Medium",
        capsule_id: Optional[str] = None
    ) -> LLMResponse:
        """
        Get a single completion (non-streaming).
        Collects the full response from the stream and returns it as LLMResponse.
        """
        full_content = ""
        model_name = agent_config.model or "google/gemma-3-27b-it:free"
        
        # Get memory context
        memory_context = ""
        if chat_id and self.memory_service._is_available():
            try:
                user_message = messages[-1]["content"] if messages else ""
                memories = self.memory_service.get_chat_memories(
                    agent_id=agent_id,
                    chat_id=chat_id,
                    query=user_message,
                    memory_size=memory_size,
                    capsule_id=capsule_id
                )
                memory_context = self.memory_service.format_memory_context(memories)
            except Exception as e:
                logger.warning(f"Memory retrieval failed: {e}")

        enhanced_messages = self._inject_system_prompt(messages, memory_context)
        
        # Collect all chunks from the stream
        async for chunk in self._stream_completion(
            enhanced_messages,
            agent_config,
            agent_id
        ):
            full_content += chunk

        # Store memory after getting full response
        if chat_id and self.memory_service._is_available():
            try:
                self.memory_service.store_chat_memory(
                    agent_id=agent_id,
                    chat_id=chat_id,
                    messages=messages + [{"role": "assistant", "content": full_content}],
                    capsule_id=capsule_id
                )
            except Exception as e:
                logger.warning(f"Memory storage failed: {e}")

        return LLMResponse(
            content=full_content,
            model=model_name,
            usage=None,
            metadata=None
        )

    # ---------------------------------------------------------------------
    # PUBLIC STREAM API
    # ---------------------------------------------------------------------

    async def get_completion_stream(
        self,
        agent_id: str,
        messages: List[Dict[str, str]],
        agent_config: Agent,
        chat_id: Optional[str] = None,
        memory_size: str = "Medium",
        capsule_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:

        memory_context = ""
        if chat_id and self.memory_service._is_available():
            try:
                user_message = messages[-1]["content"] if messages else ""
                memories = self.memory_service.get_chat_memories(
                    agent_id=agent_id,
                    chat_id=chat_id,
                    query=user_message,
                    memory_size=memory_size,
                    capsule_id=capsule_id
                )
                memory_context = self.memory_service.format_memory_context(memories)
            except Exception as e:
                logger.warning(f"Memory retrieval failed: {e}")

        enhanced_messages = self._inject_system_prompt(messages, memory_context)

        full_content = ""
        async for chunk in self._stream_completion(
            enhanced_messages,
            agent_config,
            agent_id
        ):
            full_content += chunk
            yield chunk

        if chat_id and self.memory_service._is_available():
            try:
                self.memory_service.store_chat_memory(
                    agent_id=agent_id,
                    chat_id=chat_id,
                    messages=messages + [{"role": "assistant", "content": full_content}],
                    capsule_id=capsule_id
                )
            except Exception as e:
                logger.warning(f"Memory storage failed: {e}")

    # ---------------------------------------------------------------------
    # SINGLE STREAM ROUTER (THE FIX)
    # ---------------------------------------------------------------------

    async def _stream_completion(
        self,
        messages: List[Dict[str, str]],
        agent_config: Agent,
        agent_id: str
    ) -> AsyncGenerator[str, None]:

        platform = agent_config.platform.lower()
        model = agent_config.model
        api_key = agent_config.api_key

        # 🔥 Canonical provider resolution
        if (
            platform == "openrouter"
            or "openrouter" in platform
            or agent_id in {"gpt", "mistral"}
        ):
            provider = "openrouter"
        else:
            provider = "openrouter"  # default fallback to openrouter

        async for chunk in self._provider_stream(
            provider,
            messages,
            model,
            api_key
        ):
            yield chunk

    # ---------------------------------------------------------------------
    # PROVIDER STREAM IMPLEMENTATIONS
    # ---------------------------------------------------------------------

    async def _provider_stream(
        self,
        provider: str,
        messages: List[Dict[str, str]],
        model: Optional[str],
        api_key: Optional[str]
    ) -> AsyncGenerator[str, None]:

        if provider == "openrouter":
            async for c in self._openrouter_stream(messages, model, api_key):
                yield c
        else:
            # Default to openrouter for all providers
            async for c in self._openrouter_stream(messages, model, api_key):
                yield c

    # ---------------------------------------------------------------------
    # PROVIDER-SPECIFIC STREAMS (MINIMAL, CLEAN)
    # ---------------------------------------------------------------------

    async def _openrouter_stream(self, messages, model, api_key):
        model = model or "openai/gpt-4-turbo"
        api_key = api_key or settings.OPENROUTER_API_KEY

        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.openrouter_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://solmind.ai",
                    "X-Title": "SolMind"
                },
                json={
                    "model": model,
                    "messages": messages,
                    "stream": True
                },
                timeout=60
            ) as response:

                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data.strip() == "[DONE]":
                            break
                        payload = json.loads(data)
                        delta = payload["choices"][0].get("delta", {})
                        if content := delta.get("content"):
                            yield content

    # ---------------------------------------------------------------------

    def _inject_system_prompt(self, messages: List[Dict], memory_context: str) -> List[Dict]:
        base = "You are a helpful assistant."
        suffix = f"\n\nRelevant context:\n{memory_context}" if memory_context else ""

        if any(m["role"] == "system" for m in messages):
            if not memory_context:
                return messages
            return [
                {**m, "content": m["content"] + suffix} if m["role"] == "system" else m
                for m in messages
            ]

        return [{"role": "system", "content": base + suffix}] + messages

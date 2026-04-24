from typing import Optional, List
from datetime import datetime
import uuid
from app.models.schemas import Chat, ChatCreate, ChatUpdate, Message, MessageCreate, Agent, AgentCreate, MessageRole
from app.db import store

DEFAULT_AGENTS = {
    "gpt": Agent(
        id="gpt", name="gpt", display_name="GPT-4 Turbo",
        platform="OpenRouter", api_key_configured=True,
        model="openai/gpt-4-turbo",
    ),
    "mistral": Agent(
        id="mistral", name="mistral", display_name="Mistral Large",
        platform="OpenRouter", api_key_configured=True,
        model="mistralai/mistral-large-latest",
    ),
}


class AgentService:
    async def get_user_agents(self, wallet_address: Optional[str]) -> List[Agent]:
        custom = [
            Agent(**{**a, "api_key": None})
            for a in store.agents.values()
            if not wallet_address or a.get("user_wallet") == wallet_address
        ]
        return list(DEFAULT_AGENTS.values()) + custom

    async def get_agent(self, agent_id: str, wallet_address: Optional[str]) -> Optional[Agent]:
        if agent_id in DEFAULT_AGENTS:
            return DEFAULT_AGENTS[agent_id]
        data = store.agents.get(agent_id)
        return Agent(**data) if data else None

    async def create_agent(self, agent_data: AgentCreate, wallet_address: str) -> Agent:
        agent_id = f"custom-{uuid.uuid4().hex[:8]}"
        store.agents[agent_id] = {
            "id": agent_id,
            "name": agent_data.name,
            "display_name": agent_data.display_name,
            "platform": agent_data.platform,
            "api_key_configured": True,
            "model": agent_data.model,
            "user_wallet": wallet_address,
            "api_key": agent_data.api_key,
        }
        agent = Agent(**store.agents[agent_id])
        agent.api_key = None
        return agent

    async def get_agent_chats(self, agent_id: str, wallet_address: Optional[str]) -> List[Chat]:
        result = [
            self._build_chat(cid, data)
            for cid, data in store.chats.items()
            if data.get("agent_id") == agent_id
            and (not wallet_address or data.get("user_wallet") == wallet_address)
        ]
        result.sort(key=lambda c: c.timestamp, reverse=True)
        return result

    async def create_chat(self, agent_id: str, chat_data: ChatCreate, wallet_address: str) -> Chat:
        chat_id = str(uuid.uuid4())
        store.chats[chat_id] = {
            "id": chat_id,
            "name": chat_data.name,
            "memory_size": chat_data.memory_size.value,
            "timestamp": datetime.now().isoformat(),
            "message_count": 0,
            "agent_id": agent_id,
            "capsule_id": chat_data.capsule_id,
            "user_wallet": wallet_address,
            "last_message": None,
        }
        store.messages[chat_id] = []
        return self._build_chat(chat_id, store.chats[chat_id])

    async def get_chat(self, chat_id: str, wallet_address: Optional[str]) -> Optional[Chat]:
        data = store.chats.get(chat_id)
        if not data:
            return None
        if wallet_address and data.get("user_wallet") != wallet_address:
            return None
        return self._build_chat(chat_id, data)

    async def update_chat(self, chat_id: str, chat_update: ChatUpdate, wallet_address: Optional[str]) -> Chat:
        data = store.chats.get(chat_id)
        if not data:
            raise ValueError("Chat not found")
        if chat_update.name:
            data["name"] = chat_update.name
        if chat_update.memory_size:
            data["memory_size"] = chat_update.memory_size.value
        return self._build_chat(chat_id, data)

    async def add_message(self, chat_id: str, message: MessageCreate, wallet_address: str) -> Message:
        msg = Message(
            id=str(uuid.uuid4()),
            role=message.role,
            content=message.content,
            timestamp=datetime.now(),
        )
        if chat_id not in store.messages:
            store.messages[chat_id] = []
        store.messages[chat_id].append({
            "id": msg.id,
            "role": msg.role.value,
            "content": msg.content,
            "timestamp": msg.timestamp.isoformat(),
        })
        if chat_id in store.chats:
            store.chats[chat_id]["message_count"] = len(store.messages[chat_id])
            store.chats[chat_id]["last_message"] = message.content[:100]
        return msg

    async def delete_chat(self, chat_id: str, wallet_address: Optional[str]):
        store.chats.pop(chat_id, None)
        store.messages.pop(chat_id, None)

    def _build_chat(self, chat_id: str, data: dict) -> Chat:
        msgs = [
            Message(
                id=m["id"],
                role=MessageRole(m["role"]),
                content=m["content"],
                timestamp=datetime.fromisoformat(m["timestamp"]),
            )
            for m in store.messages.get(chat_id, [])
        ]
        return Chat(
            id=data["id"],
            name=data["name"],
            memory_size=data["memory_size"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            message_count=data.get("message_count", 0),
            last_message=data.get("last_message"),
            messages=msgs,
            agent_id=data.get("agent_id"),
            capsule_id=data.get("capsule_id"),
            user_wallet=data.get("user_wallet"),
        )

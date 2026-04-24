from typing import Optional, List
from datetime import datetime
import uuid
import httpx
from app.models.schemas import Capsule, CapsuleCreate, CapsuleUpdate
from app.core.config import settings
from app.db import store


class CapsuleService:
    async def get_user_capsules(self, wallet_address: Optional[str]) -> List[Capsule]:
        return [
            Capsule(**c) for c in store.capsules.values()
            if not wallet_address or c.get("creator_wallet") == wallet_address
        ]

    async def get_capsule(self, capsule_id: str) -> Optional[Capsule]:
        data = store.capsules.get(capsule_id)
        return Capsule(**data) if data else None

    async def create_capsule(self, capsule_data: CapsuleCreate, wallet_address: str) -> Capsule:
        capsule_id = str(uuid.uuid4())
        now = datetime.now()
        store.capsules[capsule_id] = {
            "id": capsule_id,
            "name": capsule_data.name,
            "description": capsule_data.description,
            "category": capsule_data.category,
            "creator_wallet": wallet_address,
            "price_per_query": capsule_data.price_per_query,
            "stake_amount": 0.0,
            "reputation": 0.0,
            "query_count": 0,
            "rating": 0.0,
            "created_at": now,
            "updated_at": now,
            "metadata": capsule_data.metadata or {},
        }
        return Capsule(**store.capsules[capsule_id])

    async def update_capsule(self, capsule_id: str, update: CapsuleUpdate, wallet_address: str) -> Optional[Capsule]:
        data = store.capsules.get(capsule_id)
        if not data or data.get("creator_wallet") != wallet_address:
            return None
        if update.name:
            data["name"] = update.name
        if update.description:
            data["description"] = update.description
        if update.price_per_query:
            data["price_per_query"] = update.price_per_query
        if update.metadata:
            data["metadata"] = update.metadata
        data["updated_at"] = datetime.now()
        return Capsule(**data)

    async def delete_capsule(self, capsule_id: str, wallet_address: str):
        data = store.capsules.get(capsule_id)
        if data and data.get("creator_wallet") == wallet_address:
            store.capsules.pop(capsule_id)

    async def query_capsule(
        self,
        capsule_id: str,
        prompt: str,
        wallet_address: str,
        payment_signature: Optional[str] = None,
        amount_paid: Optional[float] = None,
    ) -> dict:
        capsule = await self.get_capsule(capsule_id)
        if not capsule:
            raise ValueError("Capsule not found")

        if payment_signature and amount_paid:
            verified = await self._verify_payment(
                payment_signature, wallet_address, capsule.creator_wallet, amount_paid
            )
            if not verified:
                raise ValueError("Payment verification failed")
            store.earnings.append({
                "wallet_address": capsule.creator_wallet,
                "capsule_id": capsule_id,
                "amount": amount_paid,
                "created_at": datetime.now().isoformat(),
            })

        store.capsules[capsule_id]["query_count"] += 1
        store.capsules[capsule_id]["updated_at"] = datetime.now()

        return {
            "response": f"Query processed for capsule '{capsule.name}'.",
            "capsule_id": capsule_id,
            "price_paid": amount_paid or 0,
        }

    async def _verify_payment(self, signature: str, sender: str, recipient: str, amount: float) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    settings.SOLANA_RPC_URL,
                    json={
                        "jsonrpc": "2.0", "id": 1, "method": "getTransaction",
                        "params": [signature, {"encoding": "json", "maxSupportedTransactionVersion": 0}],
                    },
                    timeout=10.0,
                )
                tx = resp.json().get("result")
                return bool(tx and tx.get("meta") and not tx["meta"].get("err"))
        except Exception:
            return False

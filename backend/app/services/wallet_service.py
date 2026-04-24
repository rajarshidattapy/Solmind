from typing import List, Optional
from datetime import datetime
import httpx
from app.models.schemas import WalletBalance, Earnings, StakingInfo, StakingCreate
from app.core.config import settings
from app.db import store
import logging

logger = logging.getLogger(__name__)


class WalletService:
    async def get_balance(self, wallet_address: str) -> WalletBalance:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    settings.SOLANA_RPC_URL,
                    json={"jsonrpc": "2.0", "id": 1, "method": "getBalance", "params": [wallet_address]},
                    timeout=10.0,
                )
                data = resp.json()
                if "result" in data:
                    sol = data["result"]["value"] / 1e9
                    return WalletBalance(wallet_address=wallet_address, balance=sol, currency="SOL")
        except Exception as e:
            logger.warning(f"Balance fetch failed: {e}")
        return WalletBalance(wallet_address=wallet_address, balance=0.0, currency="SOL")

    async def get_earnings(self, wallet_address: str, period: Optional[str] = None) -> Earnings:
        entries = [e for e in store.earnings if e.get("wallet_address") == wallet_address]
        total = sum(e.get("amount", 0) for e in entries)
        return Earnings(
            wallet_address=wallet_address,
            total_earnings=total,
            capsule_earnings=entries,
            period=period,
        )

    async def get_staking_info(self, wallet_address: str) -> List[StakingInfo]:
        return [
            StakingInfo(**s) for s in store.staking
            if s.get("wallet_address") == wallet_address
        ]

    async def create_staking(self, staking: StakingCreate, wallet_address: str) -> StakingInfo:
        info = StakingInfo(
            capsule_id=staking.capsule_id,
            wallet_address=wallet_address,
            stake_amount=staking.stake_amount,
            staked_at=datetime.now(),
        )
        store.staking.append({
            "capsule_id": info.capsule_id,
            "wallet_address": info.wallet_address,
            "stake_amount": info.stake_amount,
            "staked_at": info.staked_at.isoformat(),
        })
        if staking.capsule_id in store.capsules:
            store.capsules[staking.capsule_id]["stake_amount"] = (
                float(store.capsules[staking.capsule_id].get("stake_amount", 0)) + staking.stake_amount
            )
        return info

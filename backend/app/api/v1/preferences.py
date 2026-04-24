from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from app.core.auth_dependencies import get_wallet_address
from app.db import store

router = APIRouter(prefix="/preferences", tags=["preferences"])


class UserPreferences(BaseModel):
    default_model: Optional[str] = None
    memory_behavior: Optional[str] = None
    active_tab: Optional[str] = None
    active_sub_tab: Optional[str] = None


@router.get("/", response_model=UserPreferences)
async def get_preferences(wallet_address: Optional[str] = Depends(get_wallet_address)):
    if not wallet_address:
        raise HTTPException(status_code=401, detail="Wallet address required")
    return UserPreferences(**store.preferences.get(wallet_address, {}))


@router.post("/", response_model=UserPreferences)
async def update_preferences(
    preferences: UserPreferences,
    wallet_address: Optional[str] = Depends(get_wallet_address),
):
    if not wallet_address:
        raise HTTPException(status_code=401, detail="Wallet address required")
    existing = store.preferences.get(wallet_address, {})
    store.preferences[wallet_address] = {**existing, **preferences.model_dump(exclude_none=True)}
    return UserPreferences(**store.preferences[wallet_address])


@router.delete("/")
async def clear_preferences(wallet_address: Optional[str] = Depends(get_wallet_address)):
    if not wallet_address:
        raise HTTPException(status_code=401, detail="Wallet address required")
    store.preferences.pop(wallet_address, None)
    return {"message": "Preferences cleared"}

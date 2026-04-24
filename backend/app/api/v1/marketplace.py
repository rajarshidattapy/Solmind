from fastapi import APIRouter, Query
from typing import Optional, List
from app.models.schemas import Capsule, MarketplaceFilters
from app.services.marketplace_service import MarketplaceService

router = APIRouter()


@router.get("/", response_model=List[Capsule])
async def browse_marketplace(
    category: Optional[str] = Query(None),
    min_reputation: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    sort_by: Optional[str] = Query("popular"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Browse marketplace capsules with filters"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"Marketplace browse request: category={category}, sort_by={sort_by}, limit={limit}, offset={offset}")
    
    filters = MarketplaceFilters(
        category=category,
        min_reputation=min_reputation,
        max_price=max_price,
        sort_by=sort_by
    )
    
    service = MarketplaceService()
    result = await service.browse_capsules(filters, limit, offset)
    logger.info(f"Marketplace browse returned {len(result)} capsules")
    return result


@router.get("/trending", response_model=List[Capsule])
async def get_trending(limit: int = Query(10, ge=1, le=50)):
    """Get trending capsules"""
    service = MarketplaceService()
    return await service.get_trending_capsules(limit)


@router.get("/categories", response_model=List[str])
async def get_categories():
    """Get all available categories"""
    service = MarketplaceService()
    return await service.get_categories()


@router.get("/search", response_model=List[Capsule])
async def search_capsules(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Search capsules by name or description"""
    service = MarketplaceService()
    return await service.search_capsules(q, limit)


@router.get("/debug")
async def debug_marketplace():
    """Debug endpoint to inspect in-memory capsule state"""
    from app.db import store
    caps = list(store.capsules.values())
    return {
        "total_capsules": len(caps),
        "capsules": [
            {
                "id": c.get("id"),
                "name": c.get("name"),
                "stake_amount": c.get("stake_amount"),
                "stake_amount > 0": float(c.get("stake_amount") or 0) > 0,
            }
            for c in caps
        ],
    }


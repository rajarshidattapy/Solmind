from typing import List
from app.models.schemas import Capsule, MarketplaceFilters
from app.db import store


class MarketplaceService:
    def _staked(self) -> List[Capsule]:
        return [
            Capsule(**c) for c in store.capsules.values()
            if float(c.get("stake_amount", 0)) > 0
        ]

    async def browse_capsules(self, filters: MarketplaceFilters, limit: int, offset: int) -> List[Capsule]:
        caps = self._staked()
        if filters.category:
            caps = [c for c in caps if c.category == filters.category]
        if filters.min_reputation is not None:
            caps = [c for c in caps if c.reputation >= filters.min_reputation]
        if filters.max_price is not None:
            caps = [c for c in caps if c.price_per_query <= filters.max_price]

        sort_key = {
            "popular": lambda c: c.query_count,
            "newest": lambda c: c.created_at.isoformat() if hasattr(c.created_at, "isoformat") else str(c.created_at),
            "price_low": lambda c: c.price_per_query,
            "price_high": lambda c: c.price_per_query,
            "rating": lambda c: c.rating,
        }.get(filters.sort_by or "popular", lambda c: c.query_count)

        reverse = filters.sort_by != "price_low"
        caps.sort(key=sort_key, reverse=reverse)
        return caps[offset: offset + limit]

    async def get_trending_capsules(self, limit: int) -> List[Capsule]:
        caps = sorted(self._staked(), key=lambda c: c.query_count, reverse=True)
        return caps[:limit]

    async def get_categories(self) -> List[str]:
        cats = {c.get("category") for c in store.capsules.values() if c.get("category")}
        return sorted(cats) or ["Finance", "Gaming", "Health", "Technology", "Education"]

    async def search_capsules(self, query: str, limit: int) -> List[Capsule]:
        q = query.lower()
        caps = [
            c for c in self._staked()
            if q in c.name.lower() or q in c.description.lower()
        ]
        return caps[:limit]

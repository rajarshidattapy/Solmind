from typing import Optional, Any
import logging

logger = logging.getLogger(__name__)

_client: Optional[Any] = None


def get_client():
    global _client
    if _client is not None:
        return _client
    try:
        from supermemory import Supermemory
        from app.core.config import settings
        _client = Supermemory(api_key=settings.SUPERMEMORY_API_KEY)
        return _client
    except ImportError:
        raise RuntimeError("supermemory package not installed — run: pip install supermemory")
    except Exception as e:
        raise RuntimeError(f"Supermemory init failed: {e}")

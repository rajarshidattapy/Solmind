"""
Filecoin storage via Lighthouse — content-addressable, permanent storage.
Snapshots are uploaded as binary blobs; the returned CID is the immutable
content address retrievable from any IPFS/Lighthouse gateway.
"""

import io
import logging
import requests
from app.core.config import settings

logger = logging.getLogger(__name__)

_UPLOAD_URL = "https://node.lighthouse.storage/api/v0/add"
_GATEWAY = "https://gateway.lighthouse.storage/ipfs"


class FilecoinService:
    def __init__(self):
        self._api_key = settings.LIGHTHOUSE_API_KEY

    def is_available(self) -> bool:
        return bool(self._api_key)

    def upload(self, data: bytes, filename: str = "snapshot.bin") -> str:
        """Upload raw bytes to Lighthouse Filecoin. Returns IPFS CID."""
        if not self.is_available():
            raise RuntimeError("LIGHTHOUSE_API_KEY not set — Filecoin upload unavailable")

        resp = requests.post(
            _UPLOAD_URL,
            files={"file": (filename, io.BytesIO(data), "application/octet-stream")},
            headers={"Authorization": f"Bearer {self._api_key}"},
            timeout=60,
        )
        resp.raise_for_status()
        cid = resp.json()["Hash"]
        logger.info("Filecoin upload OK — CID: %s", cid)
        return cid

    @staticmethod
    def gateway_url(cid: str) -> str:
        return f"{_GATEWAY}/{cid}"

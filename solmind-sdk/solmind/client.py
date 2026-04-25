import json
import requests
from .errors import AuthenticationError, SolmindRuntimeError


class SolmindClient:
    def __init__(self, wallet_address: str, base_url: str):
        self.wallet_address = wallet_address
        self.base_url = base_url.rstrip("/")

    def _headers(self) -> dict:
        h = {"Content-Type": "application/json"}
        if self.wallet_address:
            h["X-Wallet-Address"] = self.wallet_address
        return h

    def _check(self, resp: requests.Response) -> dict:
        if resp.status_code == 401:
            raise AuthenticationError("Wallet address required or invalid")
        if resp.status_code == 404:
            raise SolmindRuntimeError(f"Resource not found: {resp.text}")
        if not resp.ok:
            raise SolmindRuntimeError(f"API error ({resp.status_code}): {resp.text}")
        return resp.json()

    def get(self, path: str) -> dict:
        resp = requests.get(
            f"{self.base_url}{path}",
            headers=self._headers(),
            timeout=30,
        )
        return self._check(resp)

    def post(self, path: str, payload: dict) -> dict:
        resp = requests.post(
            f"{self.base_url}{path}",
            json=payload,
            headers=self._headers(),
            timeout=30,
        )
        return self._check(resp)

    def stream(self, path: str, payload: dict):
        """POST with SSE streaming. Yields parsed event dicts."""
        resp = requests.post(
            f"{self.base_url}{path}",
            json=payload,
            headers=self._headers(),
            stream=True,
            timeout=300,
        )
        if not resp.ok:
            raise SolmindRuntimeError(f"Stream error ({resp.status_code}): {resp.text}")
        buf = ""
        for chunk in resp.iter_content(chunk_size=None, decode_unicode=True):
            buf += chunk
            while "\n" in buf:
                line, buf = buf.split("\n", 1)
                line = line.strip()
                if line.startswith("data: "):
                    try:
                        yield json.loads(line[6:])
                    except json.JSONDecodeError:
                        pass

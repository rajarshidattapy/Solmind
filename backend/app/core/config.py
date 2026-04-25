from pydantic_settings import BaseSettings
from pydantic import field_validator, Field, ConfigDict
from typing import List, Union, Optional
import os
import json
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    APP_NAME: str = "SolMind API"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    CORS_ORIGINS: Optional[List[str]] = Field(default=None)

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str], None]) -> List[str]:
        defaults = [
            "http://localhost:8080",
            "http://localhost:5173",
            "http://127.0.0.1:8080",
            "http://127.0.0.1:5173",
        ]
        if not v:
            return defaults
        if isinstance(v, list):
            return v
        v = v.strip()
        if not v:
            return defaults
        if v.startswith("["):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                pass
        origins = [o.strip() for o in v.split(",") if o.strip()]
        return origins or defaults

    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    SUPERMEMORY_API_KEY: str = os.getenv("SUPERMEMORY_API_KEY", "")
    LIGHTHOUSE_API_KEY: str = os.getenv("LIGHTHOUSE_API_KEY", "")

    SOLANA_RPC_URL: str = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
    SOLANA_NETWORK: str = os.getenv("SOLANA_NETWORK", "devnet")


settings = Settings()

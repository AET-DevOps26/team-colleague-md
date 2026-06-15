"""
Configuration module for the GenAI Service.

Uses Pydantic Settings to load configuration from environment variables.
Supports .env files for local development.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- LLM Provider ---
    llm_provider: str = "nvidia"  # "openrouter", "nvidia", or "google"
    llm_model: str = "moonshotai/kimi-k2.6"
    llm_temperature: float = 0.3

    google_api_key: str = ""
    openrouter_api_key: str = ""
    nvidia_nim_api_key: str = ""

    # --- External Source Providers ---
    github_token: str = ""
    gnews_api_key: str = ""

    # --- Opt-in Live Integration Tests ---
    run_digest_provider_integration: bool = False
    run_digest_llm_integration: bool = False

    # --- Application ---
    app_name: str = "GenAI Service"
    app_version: str = "1.0.0"
    log_level: str = "INFO"

    # --- CORS ---
    # Comma-separated list of allowed origins (e.g., "http://localhost:3000,http://localhost:8082")
    cors_origins: str = "http://localhost:3000,http://localhost:8082"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """
    Cached settings singleton.

    Uses @lru_cache so the .env file is only read once,
    and the same Settings instance is reused across the app.
    """
    return Settings()

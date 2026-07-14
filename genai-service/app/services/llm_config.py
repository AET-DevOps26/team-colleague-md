"""
Runtime LLM configuration — env default plus a mutable in-memory override (ADR-0020).

The active ``(provider, model)`` pair is the env-configured default until an Admin sets an
override through the internal config endpoint. The override lives in process memory only, so
it resets to the env default whenever the service restarts — GenAI stays stateless by design.

A provider is only selectable when its API key is configured; ``set_override`` rejects the
rest so an admin cannot switch the platform onto a provider that is guaranteed to fail.
"""

import logging
import threading
from dataclasses import dataclass

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

SUPPORTED_PROVIDERS: tuple[str, ...] = ("openrouter", "nvidia", "google", "logos")

# Which settings field carries the API key for each provider.
_API_KEY_FIELDS: dict[str, str] = {
    "openrouter": "openrouter_api_key",
    "nvidia": "nvidia_nim_api_key",
    "google": "google_api_key",
    "logos": "logos_api_key",
}

_lock = threading.Lock()
_override: tuple[str, str] | None = None


class ProviderNotSupportedError(ValueError):
    """Raised when the requested provider is not one of SUPPORTED_PROVIDERS."""


class ProviderNotConfiguredError(ValueError):
    """Raised when the requested provider has no API key configured."""


@dataclass(frozen=True)
class ProviderAvailability:
    name: str
    configured: bool


def is_configured(provider: str, settings: Settings | None = None) -> bool:
    """True when the provider has a non-empty API key in the environment."""
    settings = settings or get_settings()
    field = _API_KEY_FIELDS.get(provider.lower())
    if field is None:
        return False
    return bool(getattr(settings, field, "").strip())


def provider_availability(settings: Settings | None = None) -> list[ProviderAvailability]:
    """Report every supported provider and whether it is usable (API key present)."""
    settings = settings or get_settings()
    return [ProviderAvailability(name=p, configured=is_configured(p, settings)) for p in SUPPORTED_PROVIDERS]


def active_settings() -> Settings:
    """
    Settings with the in-memory override applied.

    Callers build LLM clients from this rather than ``get_settings()`` so a runtime provider
    switch is picked up on the next request without a restart.
    """
    settings = get_settings()
    with _lock:
        override = _override
    if override is None:
        return settings
    provider, model = override
    return settings.model_copy(update={"llm_provider": provider, "llm_model": model})


def set_override(provider: str, model: str) -> Settings:
    """
    Point the service at a new (provider, model) pair for the rest of this process's life.

    Raises:
        ProviderNotSupportedError: the provider is unknown.
        ProviderNotConfiguredError: the provider has no API key configured.
    """
    global _override

    normalized = provider.strip().lower()
    if normalized not in SUPPORTED_PROVIDERS:
        raise ProviderNotSupportedError(f"Unsupported LLM provider: {provider}")
    if not is_configured(normalized):
        raise ProviderNotConfiguredError(f"Provider '{normalized}' has no API key configured.")

    cleaned_model = model.strip()
    if not cleaned_model:
        raise ValueError("Model must not be blank.")

    with _lock:
        _override = (normalized, cleaned_model)

    logger.info("LLM override set (provider=%s, model=%s)", normalized, cleaned_model)
    return active_settings()


def reset_override() -> None:
    """Drop the override and fall back to the env default. Used by tests."""
    global _override
    with _lock:
        _override = None

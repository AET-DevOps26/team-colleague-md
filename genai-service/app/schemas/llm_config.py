"""Pydantic schemas for the runtime LLM configuration endpoints (ADR-0020)."""

from pydantic import BaseModel, Field


class ProviderAvailabilityResponse(BaseModel):
    """One supported provider and whether it can actually be selected."""

    name: str = Field(..., description="Provider key, e.g. 'nvidia'.")
    configured: bool = Field(..., description="True when an API key for this provider is present.")


class LlmConfigResponse(BaseModel):
    """The live (provider, model) pair plus what an admin is allowed to switch to."""

    provider: str
    model: str
    temperature: float
    availableProviders: list[ProviderAvailabilityResponse]


class LlmConfigUpdateRequest(BaseModel):
    """Admin-requested provider/model switch. Applies until the service restarts."""

    provider: str = Field(..., min_length=1, description="One of the supported providers.")
    model: str = Field(..., min_length=1, description="Free-text model id for that provider.")

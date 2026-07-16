"""
Runtime LLM configuration router — GET/PUT /internal/v1/llm-config (ADR-0020).

Internal-token only, like every other GenAI route: the browser reaches these through
content-service's admin front door (`/api/v1/admin/genai/llm-config`), which is the layer
that checks the ADMIN role on the caller's JWT.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException

from app.schemas.llm_config import LlmConfigResponse, LlmConfigUpdateRequest, ProviderAvailabilityResponse
from app.security import require_internal_service
from app.services.llm_config import (
    ProviderNotConfiguredError,
    ProviderNotSupportedError,
    active_settings,
    provider_availability,
    set_override,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/internal/v1",
    tags=["Internal"],
    dependencies=[Depends(require_internal_service)],
)


def _to_response(settings) -> LlmConfigResponse:
    return LlmConfigResponse(
        provider=settings.llm_provider,
        model=settings.llm_model,
        temperature=settings.llm_temperature,
        availableProviders=[
            ProviderAvailabilityResponse(name=p.name, configured=p.configured)
            for p in provider_availability()
        ],
    )


@router.get(
    "/llm-config",
    response_model=LlmConfigResponse,
    summary="Get the active LLM configuration",
    description=(
        "Returns the (provider, model) pair currently in use — the in-memory override when an "
        "admin has set one, otherwise the environment default — along with every supported "
        "provider and whether its API key is configured."
    ),
)
async def get_llm_config() -> LlmConfigResponse:
    return _to_response(active_settings())


@router.put(
    "/llm-config",
    response_model=LlmConfigResponse,
    summary="Override the active LLM configuration",
    description=(
        "Switches the provider/model for the rest of this process's life. The override is held "
        "in memory only and resets to the environment default on restart (ADR-0020). Selecting a "
        "provider with no API key configured is rejected."
    ),
    responses={
        400: {"description": "Unknown provider, or provider has no API key configured"},
    },
)
async def update_llm_config(request: LlmConfigUpdateRequest) -> LlmConfigResponse:
    try:
        updated = set_override(request.provider, request.model)
    except ProviderNotSupportedError as e:
        raise HTTPException(
            status_code=400,
            detail={"error": "unsupported_provider", "message": str(e)},
        )
    except ProviderNotConfiguredError as e:
        raise HTTPException(
            status_code=400,
            detail={"error": "provider_not_configured", "message": str(e)},
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"error": "invalid_llm_config", "message": str(e)},
        )

    return _to_response(updated)

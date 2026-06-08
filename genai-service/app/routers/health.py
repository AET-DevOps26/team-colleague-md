"""
Health check router.

Provides a simple health endpoint for Docker healthchecks
and Kubernetes liveness probes.
"""

from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    """
    Health check endpoint.

    Returns:
        200 OK with service status. Used by Docker healthcheck
        and Kubernetes liveness probe.
    """
    return {"status": "ok", "service": "GenAI Service"}

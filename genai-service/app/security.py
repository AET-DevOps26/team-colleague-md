"""
Internal service authentication helpers.
"""

import hmac

from fastapi import Header, HTTPException, status

from app.config import get_settings

INTERNAL_SERVICE_TOKEN_HEADER = "X-Internal-Service-Token"


def require_internal_service(
    x_internal_service_token: str | None = Header(default=None, alias=INTERNAL_SERVICE_TOKEN_HEADER),
) -> None:
    """Require the shared internal-service token used by the Spring services."""
    expected = get_settings().internal_service_token
    if not expected or not x_internal_service_token or not hmac.compare_digest(x_internal_service_token, expected):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "internal_service_forbidden",
                "message": "Internal callers only.",
            },
        )

"""
GenAI Service — FastAPI Application.

This is the application factory (equivalent to @SpringBootApplication).
It creates the FastAPI instance, registers middleware, and mounts routers.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, get_settings
from app.routers import digest, health, summarize

logger = logging.getLogger(__name__)


def _configure_logging(settings: Settings) -> None:
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        force=True,
    )


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns:
        Configured FastAPI instance with all routers and middleware.
    """
    settings = get_settings()
    _configure_logging(settings)

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "AI-powered microservice for the Verita knowledge-sharing platform. "
            "Provides post summarization, tag suggestion, and daily digest generation."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # --- CORS Middleware ---
    # Allows the frontend (localhost:3000) and Content Service (localhost:8082)
    # to call this service from the browser.
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Register Routers ---
    # Each router is like including a @RestController in Spring's component scan.
    # Add new routers here as features are built (e.g., tags_router, digest_router in W3).
    application.include_router(health.router)
    application.include_router(summarize.router)
    application.include_router(digest.router)

    logger.info(
        "GenAI Service started (model=%s, cors=%s)",
        settings.llm_model,
        settings.cors_origins,
    )

    return application


# Create the app instance — uvicorn references this as "app.main:app"
app = create_app()

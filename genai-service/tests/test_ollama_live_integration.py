"""Opt-in endpoint tests against an already-running, already-populated Ollama."""

from datetime import datetime, timedelta, timezone
import time
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.services.digest_jobs import clear_jobs
from app.services.external_sources import ExternalSourceItem
from app.services.llm_config import reset_override
from app.services.output_sanitizer import sanitize_text

MODEL = "qwen3:4b-instruct"
INTERNAL_TOKEN = "ollama-live-integration-token"
HEADERS = {"X-Internal-Service-Token": INTERNAL_TOKEN}
DEADLINE_SECONDS = 300


@pytest.fixture(scope="module", autouse=True)
def ollama_settings():
    """Select the documented local model only when the live suite is explicitly enabled."""
    settings = get_settings()
    if not settings.run_ollama_integration:
        pytest.skip("Set RUN_OLLAMA_INTEGRATION=1 to call local Ollama.")

    previous = {
        "internal_service_token": settings.internal_service_token,
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
        "llm_temperature": settings.llm_temperature,
        "ollama_base_url": settings.ollama_base_url,
    }
    settings.internal_service_token = INTERNAL_TOKEN
    settings.llm_provider = "ollama"
    settings.llm_model = MODEL
    settings.llm_temperature = 0.0
    settings.ollama_base_url = (
        settings.ollama_base_url.strip() or "http://localhost:11434/v1"
    )
    reset_override()
    clear_jobs()

    yield settings

    clear_jobs()
    reset_override()
    for field, value in previous.items():
        setattr(settings, field, value)


@pytest.fixture(scope="module")
def client(ollama_settings):
    test_client = TestClient(app)
    test_client.headers.update(HEADERS)
    return test_client


def test_ollama_summarizes_through_fastapi_endpoint(client):
    started_at = time.monotonic()

    response = client.post(
        "/api/v1/genai/summarize",
        json={
            "postId": "123e4567-e89b-12d3-a456-426614174000",
            "title": "Compact local models for private application workflows",
            "content": (
                "The team added a local inference option so developers can summarize posts "
                "without sending their content to a cloud provider. The first supported model "
                "is qwen3:4b-instruct served by Ollama on the developer machine. The GenAI "
                "service remains containerized and reaches Ollama through its OpenAI-compatible "
                "endpoint. The local profile uses deterministic generation and a larger timeout "
                "because CPU and unified-memory inference is slower than hosted inference."
            ),
        },
    )

    assert time.monotonic() - started_at < DEADLINE_SECONDS
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["model"] == MODEL
    assert 3 <= len(body["summary"]) <= 5
    assert all(bullet and sanitize_text(bullet) == bullet for bullet in body["summary"])


def test_ollama_generates_digest_through_job_endpoint(client):
    period_end = datetime.now(timezone.utc)
    period_start = period_end - timedelta(hours=24)
    fixture_urls = {
        "https://example.com/local-model-runtime",
        "https://example.com/structured-output",
    }
    sources = [
        ExternalSourceItem(
            provider="gnews",
            topicId="topic-local-llms",
            topicName="Local LLMs",
            title="Ollama runtime adds efficient local model serving",
            snippet=(
                "The runtime serves local language models through an OpenAI-compatible API and "
                "supports configurable context windows for application workloads."
            ),
            url="https://example.com/local-model-runtime",
            publishedAt=period_start + timedelta(hours=8),
            sourceName="Local AI News",
        ),
        ExternalSourceItem(
            provider="github",
            topicId="topic-local-llms",
            topicName="Local LLMs",
            title="Structured output support reaches local inference workflows",
            snippet=(
                "Developers can constrain model responses with JSON schema and validate the "
                "result before exposing generated content to application users."
            ),
            url="https://example.com/structured-output",
            publishedAt=period_start + timedelta(hours=14),
            sourceName="Example Repository",
        ),
    ]
    fetch_sources = AsyncMock(return_value=(sources, []))
    started_at = time.monotonic()

    with patch(
        "app.services.digest_runner.fetch_and_select_sources", fetch_sources
    ):
        accepted = client.post(
            "/api/v1/genai/digests/generate",
            json={
                "requestId": "ollama-live-digest",
                "userId": "123e4567-e89b-12d3-a456-426614174000",
                "digestDate": period_end.date().isoformat(),
                "periodStart": period_start.isoformat(),
                "periodEnd": period_end.isoformat(),
                "timezone": "UTC",
                "topics": [{"id": "topic-local-llms", "name": "Local LLMs"}],
                "maxSourcesPerTopic": 5,
                "maxEvents": 3,
                "tone": "technical",
            },
        )

    assert time.monotonic() - started_at < DEADLINE_SECONDS
    assert accepted.status_code == 202, accepted.text
    fetch_sources.assert_awaited_once()

    status = client.get(accepted.json()["statusUrl"])
    assert status.status_code == 200
    job = status.json()
    assert job["status"] == "SUCCEEDED", job.get("error")
    result = job["result"]
    assert result["model"] == MODEL
    assert result["events"]
    assert result["summary"] and sanitize_text(result["summary"]) == result["summary"]
    cited_urls = {
        source["url"]
        for event in result["events"]
        for source in event["sources"]
    }
    assert cited_urls
    assert cited_urls <= fixture_urls
    assert all(
        bullet and sanitize_text(bullet) == bullet
        for event in result["events"]
        for bullet in event["summaryBullets"]
    )

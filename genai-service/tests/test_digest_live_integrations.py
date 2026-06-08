"""
Opt-in live integration tests for digest generation.

These tests call real external services. They are skipped by default because they
can be slow, flaky, rate-limited, or paid depending on configured credentials.
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.config import get_settings
from app.schemas.digest import DigestGenerateRequest, DigestTopic
from app.services.digest_generator import generate_digest
from app.services.external_sources import ExternalSourceItem, fetch_and_select_sources


def _last_day_request(topic_name: str = "LLMs") -> DigestGenerateRequest:
    period_end = datetime.now(timezone.utc)
    period_start = period_end - timedelta(hours=24)
    return DigestGenerateRequest(
        userId="user-live-integration-test",
        requestId="live-integration-test",
        digestDate=period_end.date(),
        periodStart=period_start,
        periodEnd=period_end,
        timezone="UTC",
        topics=[DigestTopic(id="topic-live-llms", name=topic_name)],
        maxSourcesPerTopic=3,
        maxEvents=3,
        tone="technical",
    )


def _llm_credentials_available() -> bool:
    settings = get_settings()
    provider = settings.llm_provider.lower()
    if provider == "openrouter":
        return bool(settings.openrouter_api_key)
    if provider == "google":
        return bool(settings.google_api_key)
    if provider == "nvidia":
        return bool(settings.nvidia_nim_api_key)
    return False


@pytest.mark.asyncio
async def test_live_provider_apis_return_usable_digest_sources():
    """
    Calls real provider APIs and exercises real normalization/selection.

    Enable with:
      RUN_DIGEST_PROVIDER_INTEGRATION=1 pytest tests/test_digest_live_integrations.py
    """
    if not get_settings().run_digest_provider_integration:
        pytest.skip("Set RUN_DIGEST_PROVIDER_INTEGRATION=1 to call live provider APIs.")

    sources, warnings = await fetch_and_select_sources(_last_day_request())

    if not sources:
        pytest.skip(f"Live providers returned no sources for this 24h window. warnings={warnings}")

    assert len(sources) <= 3
    assert all(source.title for source in sources)
    assert all(source.snippet for source in sources)
    assert all(source.url.startswith("http") for source in sources)
    assert {source.provider for source in sources}.issubset(
        {"github", "gnews", "huggingface"}
    )


@pytest.mark.asyncio
async def test_live_llm_endpoint_generates_digest_from_static_source():
    """
    Calls the configured real LLM endpoint with a static source item.

    Enable with:
      RUN_DIGEST_LLM_INTEGRATION=1 pytest tests/test_digest_live_integrations.py
    """
    if not get_settings().run_digest_llm_integration:
        pytest.skip("Set RUN_DIGEST_LLM_INTEGRATION=1 to call the live LLM endpoint.")
    if not _llm_credentials_available():
        pytest.skip("Configured LLM provider credentials are missing.")

    request = _last_day_request()
    source = ExternalSourceItem(
        provider="gnews",
        topicId="topic-live-llms",
        topicName="LLMs",
        title="New long-context benchmark compares language model retrieval behavior",
        snippet=(
            "A new benchmark report compares how language models retrieve details "
            "from long context windows and highlights differences between model families."
        ),
        url="https://example.com/llm-long-context-benchmark",
        publishedAt=request.periodStart + timedelta(hours=12),
        sourceName="Integration Test Source",
    )

    result = await generate_digest(request, [source])

    assert result.model
    assert result.title
    assert result.summary
    assert result.sourceCount == 1
    assert result.eventCount >= 1
    assert result.events[0].topicIds == ["topic-live-llms"]
    assert "https://example.com/llm-long-context-benchmark" in result.events[0].sourceUrls

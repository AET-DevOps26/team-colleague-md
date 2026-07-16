"""
Tests for external source selection with only provider APIs mocked.
"""

from datetime import date, datetime, timezone
from typing import cast
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.schemas.digest import DigestGenerateRequest, DigestJobWarning, DigestTopic
from app.services.external_sources import (
    ExternalSourceItem,
    _clean_snippet,
    _fetch_github_sources,
    _fetch_gnews_sources,
    fetch_and_select_sources,
)


def _request() -> DigestGenerateRequest:
    return DigestGenerateRequest(
        requestId=None,
        userId=None,
        digestDate=date(2026, 6, 4),
        periodStart=datetime(2026, 6, 3, tzinfo=timezone.utc),
        periodEnd=datetime(2026, 6, 4, tzinfo=timezone.utc),
        timezone="Europe/Berlin",
        topics=[
            DigestTopic(id="topic-llms", name="LLMs"),
            DigestTopic(id="topic-agents", name="AI Agents"),
        ],
        maxSourcesPerTopic=2,
        maxEvents=8,
        tone="technical",
    )


def _source(provider: str, topic_id: str, index: int) -> ExternalSourceItem:
    return ExternalSourceItem(
        provider=provider,
        topicId=topic_id,
        topicName="LLMs" if topic_id == "topic-llms" else "AI Agents",
        title=f"{provider} source {index}",
        snippet="Provider-provided snippet for digest generation.",
        url=f"https://example.com/{provider}/{topic_id}/{index}",
        publishedAt=datetime(2026, 6, 3, 12, index, tzinfo=timezone.utc),
        sourceName=provider,
    )


def test_clean_snippet_normalizes_smart_punctuation():
    snippet = _clean_snippet(
        "\u201cAgentic AI\u201d isn\u2019t paused\u2026 it\u2019s moving fast \u2013 maybe faster \u2014 today."
    )

    assert snippet == '"Agentic AI" isn\'t paused... it\'s moving fast - maybe faster - today.'


def test_clean_snippet_removes_unicode_format_characters():
    snippet = _clean_snippet(
        "Businesses \u200bmay spend on \u2060models, agents \u200band more next \u200byear."
    )

    assert snippet == "Businesses may spend on models, agents and more next year."


class _FakeGNewsResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {
            "articles": [
                {
                    "title": "🚀 AI agents gain new tool support",
                    "description": "A product update added tool-use features 🧰 for AI agents.",
                    "content": "Fallback content should not be needed.",
                    "url": "https://example.com/gnews/agents",
                    "publishedAt": "2026-06-03T12:00:00Z",
                    "source": {"name": "Example News"},
                }
            ]
        }


class _FakeGNewsClient:
    def __init__(self):
        self.calls = []

    async def get(self, url, params):
        self.calls.append((url, params))
        return _FakeGNewsResponse()


class _FakeEmojiOnlyGNewsResponse(_FakeGNewsResponse):
    def json(self):
        payload = super().json()
        payload["articles"][0]["title"] = "🚀"
        return payload


class _FakeEmojiOnlyGNewsClient(_FakeGNewsClient):
    async def get(self, url, params):
        self.calls.append((url, params))
        return _FakeEmojiOnlyGNewsResponse()


@pytest.mark.asyncio
@patch("app.services.external_sources._fetch_huggingface_sources", new_callable=AsyncMock)
@patch("app.services.external_sources._fetch_gnews_sources", new_callable=AsyncMock)
@patch("app.services.external_sources._fetch_github_sources", new_callable=AsyncMock)
@patch("app.services.external_sources.get_settings")
async def test_fetch_and_select_sources_only_mocks_provider_apis(
    mock_settings,
    mock_github,
    mock_gnews,
    mock_huggingface,
):
    """Real dedupe/round-robin selection runs; provider fetch APIs are mocked."""
    mock_settings.return_value.gnews_api_key = "test-gnews-key"

    async def github_side_effect(_client, _request, topic):
        return ([_source("github", topic.id, 1)], [])

    async def gnews_side_effect(_client, _request, topic):
        return ([_source("gnews", topic.id, 1)], [])

    async def huggingface_side_effect(_client, _request, topic):
        return ([_source("huggingface", topic.id, 1)], [])

    mock_github.side_effect = github_side_effect
    mock_gnews.side_effect = gnews_side_effect
    mock_huggingface.side_effect = huggingface_side_effect

    sources, warnings = await fetch_and_select_sources(_request())

    assert warnings == []
    assert len(sources) == 4
    assert len([source for source in sources if source.topicId == "topic-llms"]) == 2
    assert len([source for source in sources if source.topicId == "topic-agents"]) == 2
    assert {source.provider for source in sources}.issubset(
        {"github", "gnews", "huggingface"}
    )


@pytest.mark.asyncio
@patch("app.services.external_sources._fetch_huggingface_sources", new_callable=AsyncMock)
@patch("app.services.external_sources._fetch_gnews_sources", new_callable=AsyncMock)
@patch("app.services.external_sources._fetch_github_sources", new_callable=AsyncMock)
@patch("app.services.external_sources.get_settings")
async def test_fetch_and_select_sources_keeps_partial_success_warnings(
    mock_settings,
    mock_github,
    mock_gnews,
    mock_huggingface,
):
    """Provider/topic warnings are returned while usable sources are still selected."""
    mock_settings.return_value.gnews_api_key = "test-gnews-key"

    async def github_side_effect(_client, _request, topic):
        if topic.id == "topic-llms":
            return ([_source("github", topic.id, 1)], [])
        return ([], [])

    async def gnews_side_effect(_client, _request, topic):
        if topic.id == "topic-llms":
            return (
                [],
                [
                    DigestJobWarning(
                        provider="gnews",
                        topicId=topic.id,
                        code="provider_error",
                        message="GNews failed for topic 'LLMs'.",
                    )
                ],
            )
        return ([], [])

    mock_github.side_effect = github_side_effect
    mock_gnews.side_effect = gnews_side_effect
    mock_huggingface.return_value = ([], [])

    sources, warnings = await fetch_and_select_sources(_request())

    assert [source.topicId for source in sources] == ["topic-llms"]
    assert any(warning.code == "provider_error" for warning in warnings)
    assert any(
        warning.code == "no_sources_for_topic" and warning.topicId == "topic-agents"
        for warning in warnings
    )


@pytest.mark.asyncio
@patch("app.services.external_sources.get_settings")
async def test_fetch_gnews_sources_uses_gnews_search_api(mock_settings):
    """GNews fetch uses UTC ISO date filters and normalizes articles."""
    mock_settings.return_value.gnews_api_key = "test-gnews-key"
    request = _request().model_copy(update={"maxSourcesPerTopic": 20})
    client = _FakeGNewsClient()

    sources, warnings = await _fetch_gnews_sources(
        cast(httpx.AsyncClient, client),
        request,
        request.topics[1],
    )

    assert warnings == []
    assert len(sources) == 1
    assert sources[0].provider == "gnews"
    assert sources[0].title == "AI agents gain new tool support"
    assert sources[0].snippet == "A product update added tool-use features for AI agents."
    assert sources[0].sourceName == "Example News"

    url, params = client.calls[0]
    assert url == "https://gnews.io/api/v4/search"
    assert params == {
        "q": "AI Agents",
        "from": "2026-06-03T00:00:00Z",
        "to": "2026-06-04T00:00:00Z",
        "lang": "en",
        "in": "title,description",
        "sortby": "publishedAt",
        "max": 10,
        "apikey": "test-gnews-key",
    }


@pytest.mark.asyncio
@patch("app.services.external_sources.get_settings")
async def test_fetch_gnews_sources_discards_emoji_only_titles(mock_settings):
    mock_settings.return_value.gnews_api_key = "test-gnews-key"
    request = _request()

    sources, warnings = await _fetch_gnews_sources(
        cast(httpx.AsyncClient, _FakeEmojiOnlyGNewsClient()),
        request,
        request.topics[1],
    )

    assert warnings == []
    assert sources == []


@pytest.mark.asyncio
async def test_fetch_github_sources_discards_emoji_only_release_title():
    request = _request()
    releases = [
        {
            "name": "🚀",
            "body": "A valid release description.",
            "html_url": "https://github.com/owner/repo/releases/tag/v1",
            "published_at": "2026-06-03T12:00:00Z",
        }
    ]
    with (
        patch("app.services.external_sources.get_settings") as mock_settings,
        patch("app.services.external_sources._matching_github_repos", return_value=["owner/repo"]),
        patch(
            "app.services.external_sources._github_get",
            new_callable=AsyncMock,
            side_effect=[releases, {"items": []}],
        ),
    ):
        mock_settings.return_value.github_token = None

        sources, warnings = await _fetch_github_sources(
            cast(httpx.AsyncClient, object()),
            request,
            request.topics[0],
        )

    assert warnings == []
    assert sources == []

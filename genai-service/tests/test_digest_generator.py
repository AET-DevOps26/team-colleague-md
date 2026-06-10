"""
Tests for digest LLM generation with only the LLM boundary mocked.
"""

from datetime import date, datetime, timezone
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.schemas.digest import DigestGenerateRequest, DigestTopic
from app.services.digest_generator import (
    DigestJsonParseError,
    DigestLlmEvent,
    DigestLlmOutput,
    SYSTEM_PROMPT,
    _build_digest_chain,
    generate_digest,
)
from app.services.external_sources import ExternalSourceItem


def _request() -> DigestGenerateRequest:
    return DigestGenerateRequest(
        requestId="recommendation-2026-06-04-user-123",
        userId="123e4567-e89b-12d3-a456-426614174000",
        digestDate=date(2026, 6, 4),
        periodStart=datetime(2026, 6, 3, tzinfo=timezone.utc),
        periodEnd=datetime(2026, 6, 4, tzinfo=timezone.utc),
        timezone="Europe/Berlin",
        topics=[
            DigestTopic(id="topic-llms", name="LLMs"),
            DigestTopic(id="topic-agents", name="AI Agents"),
        ],
        maxSourcesPerTopic=5,
        maxEvents=8,
        tone="technical",
    )


def _source() -> ExternalSourceItem:
    return ExternalSourceItem(
        provider="gnews",
        topicId="topic-llms",
        topicName="LLMs",
        title="New LLM benchmark released",
        snippet="A new benchmark compares long-context behavior across major language models.",
        url="https://example.com/llm-benchmark",
        publishedAt=datetime(2026, 6, 3, 12, 0, tzinfo=timezone.utc),
        sourceName="Example News",
    )


def test_digest_prompt_requires_combined_source_citations():
    assert "include every combined source ID" in SYSTEM_PROMPT
    assert "do not cite unrelated sources" in SYSTEM_PROMPT


def test_build_digest_chain_requests_structured_output():
    class FakeLlm:
        schema = None
        include_raw = None
        method = None

        def with_structured_output(self, schema, include_raw=False, method=None):
            self.schema = schema
            self.include_raw = include_raw
            self.method = method
            return lambda value: value

    fake_llm = FakeLlm()
    with (
        patch("app.services.digest_generator.get_settings") as mock_settings,
        patch("app.services.digest_generator._get_llm", return_value=fake_llm),
    ):
        mock_settings.return_value = SimpleNamespace(llm_model="test-model")

        chain, model = _build_digest_chain()

    assert chain is not None
    assert model == "test-model"
    assert fake_llm.schema is DigestLlmOutput
    assert fake_llm.include_raw is False
    assert fake_llm.method is None


def test_build_digest_chain_uses_plain_structured_output_once():
    class FakeLlm:
        calls = []

        def with_structured_output(self, schema, include_raw=False, method=None):
            self.calls.append((schema, include_raw, method))
            return lambda value: value

    fake_llm = FakeLlm()
    with (
        patch("app.services.digest_generator.get_settings") as mock_settings,
        patch("app.services.digest_generator._get_llm", return_value=fake_llm),
    ):
        mock_settings.return_value = SimpleNamespace(llm_model="test-model")

        chain, model = _build_digest_chain()

    assert chain is not None
    assert model == "test-model"
    assert fake_llm.calls == [(DigestLlmOutput, False, None)]


@pytest.mark.asyncio
@patch("app.services.digest_generator._build_digest_chain")
async def test_generate_digest_only_mocks_llm_api(mock_build_chain):
    """Real prompt grouping and validation run; only the LLM chain is mocked."""
    chain = AsyncMock()
    chain.ainvoke.return_value = {
        "raw": SimpleNamespace(
            usage_metadata={"input_tokens": 120, "output_tokens": 80, "total_tokens": 200}
        ),
        "parsed": DigestLlmOutput(
            title="Your Thursday AI Digest",
            topStorySubtitle="LLM benchmarking led today's AI updates.",
            summary="New model evaluation work shaped the day.",
            events=[
                DigestLlmEvent(
                    headline="New LLM benchmark compares long-context behavior",
                    summaryBullets=["The benchmark highlights differences in retrieval quality."],
                    topicKeys=["t1"],
                    sourceIds=["s1"],
                )
            ],
        ),
        "parsing_error": None,
    }
    mock_build_chain.return_value = (chain, "test-model")

    result = await generate_digest(_request(), [_source()])

    assert result.title == "Your Thursday AI Digest"
    assert result.model == "test-model"
    assert result.sourceCount == 1
    assert result.eventCount == 1
    assert result.events[0].topicIds == ["topic-llms"]
    assert result.events[0].sourceUrls == ["https://example.com/llm-benchmark"]
    assert result.usage is not None
    assert result.usage.total_tokens == 200

    prompt_payload = json.loads(chain.ainvoke.await_args.args[0]["input_json"])
    assert prompt_payload["topics"][0]["topicKey"] == "t1"
    assert "id" not in prompt_payload["topics"][0]
    assert prompt_payload["topics"][0]["sources"][0]["sourceId"] == "s1"
    assert "topicId" not in prompt_payload["topics"][0]["sources"][0]
    assert "url" not in prompt_payload["topics"][0]["sources"][0]
    assert prompt_payload["topics"][0]["sources"][0]["snippet"].startswith("A new benchmark")


@pytest.mark.asyncio
@patch("app.services.digest_generator._build_digest_chain")
async def test_generate_digest_accepts_direct_structured_output_without_usage(mock_build_chain):
    chain = AsyncMock()
    chain.ainvoke.return_value = DigestLlmOutput(
        title="Your Thursday AI Digest",
        topStorySubtitle="LLM benchmarking led today's AI updates.",
        summary="New model evaluation work shaped the day.",
        events=[
            DigestLlmEvent(
                headline="New LLM benchmark compares long-context behavior",
                summaryBullets=["The benchmark highlights differences in retrieval quality."],
                topicKeys=["t1"],
                sourceIds=["s1"],
            )
        ],
    )
    mock_build_chain.return_value = (chain, "test-model")

    result = await generate_digest(_request(), [_source()])

    assert result.eventCount == 1
    assert result.usage is None


@pytest.mark.asyncio
@patch("app.services.digest_generator._build_digest_chain")
async def test_generate_digest_rejects_invalid_structured_output(mock_build_chain):
    chain = AsyncMock()
    chain.ainvoke.return_value = {
        "raw": SimpleNamespace(content="not a valid structured digest"),
        "parsed": None,
        "parsing_error": ValueError("schema mismatch"),
    }
    mock_build_chain.return_value = (chain, "test-model")

    with pytest.raises(DigestJsonParseError, match="invalid structured digest output"):
        await generate_digest(_request(), [_source()])


@pytest.mark.asyncio
@patch("app.services.digest_generator._build_digest_chain")
async def test_generate_digest_rejects_invalid_source_ids(mock_build_chain):
    chain = AsyncMock()
    chain.ainvoke.return_value = DigestLlmOutput(
        title="Your Thursday AI Digest",
        topStorySubtitle="LLM benchmarking led today's AI updates.",
        summary="New model evaluation work shaped the day.",
        events=[
            DigestLlmEvent(
                headline="New LLM benchmark compares long-context behavior",
                summaryBullets=["The benchmark highlights differences in retrieval quality."],
                topicKeys=["t1"],
                sourceIds=["not-a-real-source"],
            )
        ],
    )
    mock_build_chain.return_value = (chain, "test-model")

    with pytest.raises(DigestJsonParseError, match="invalid topicKeys or sourceIds"):
        await generate_digest(_request(), [_source()])


@pytest.mark.asyncio
@patch("app.services.digest_generator._build_digest_chain")
async def test_generate_digest_rejects_invalid_topic_keys(mock_build_chain):
    chain = AsyncMock()
    chain.ainvoke.return_value = DigestLlmOutput(
        title="Your Thursday AI Digest",
        topStorySubtitle="LLM benchmarking led today's AI updates.",
        summary="New model evaluation work shaped the day.",
        events=[
            DigestLlmEvent(
                headline="New LLM benchmark compares long-context behavior",
                summaryBullets=["The benchmark highlights differences in retrieval quality."],
                topicKeys=["not-a-real-topic"],
                sourceIds=["s1"],
            )
        ],
    )
    mock_build_chain.return_value = (chain, "test-model")

    with pytest.raises(DigestJsonParseError, match="invalid topicKeys or sourceIds"):
        await generate_digest(_request(), [_source()])

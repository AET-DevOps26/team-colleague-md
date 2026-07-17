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
from app.services.output_sanitizer import InvalidLlmOutputError


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
    assert "Do not use emoji" in SYSTEM_PROMPT


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
        patch("app.services.digest_generator.active_settings") as mock_settings,
        patch("app.services.digest_generator._get_llm", return_value=fake_llm),
    ):
        mock_settings.return_value = SimpleNamespace(
            llm_provider="nvidia", llm_model="test-model"
        )

        chain, model = _build_digest_chain()

    assert chain is not None
    assert model == "test-model"
    assert fake_llm.schema is DigestLlmOutput
    assert fake_llm.include_raw is True
    assert fake_llm.method is None


def test_build_digest_chain_uses_plain_structured_output_once():
    class FakeLlm:
        calls = []

        def with_structured_output(self, schema, include_raw=False, method=None):
            self.calls.append((schema, include_raw, method))
            return lambda value: value

    fake_llm = FakeLlm()
    with (
        patch("app.services.digest_generator.active_settings") as mock_settings,
        patch("app.services.digest_generator._get_llm", return_value=fake_llm),
    ):
        mock_settings.return_value = SimpleNamespace(
            llm_provider="nvidia", llm_model="test-model"
        )

        chain, model = _build_digest_chain()

    assert chain is not None
    assert model == "test-model"
    assert fake_llm.calls == [(DigestLlmOutput, True, None)]


def test_build_digest_chain_uses_json_schema_for_ollama():
    class FakeLlm:
        calls = []

        def with_structured_output(self, schema, include_raw=False, method=None):
            self.calls.append((schema, include_raw, method))
            return lambda value: value

    fake_llm = FakeLlm()
    with (
        patch("app.services.digest_generator.active_settings") as mock_settings,
        patch("app.services.digest_generator._get_llm", return_value=fake_llm),
    ):
        mock_settings.return_value = SimpleNamespace(
            llm_provider="ollama", llm_model="qwen3:4b-instruct"
        )

        chain, model = _build_digest_chain()

    assert chain is not None
    assert model == "qwen3:4b-instruct"
    assert fake_llm.calls == [(DigestLlmOutput, True, "json_schema")]


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

    assert not hasattr(result, "title")
    assert result.model == "test-model"
    assert result.sourceCount == 1
    assert result.eventCount == 1
    assert result.events[0].topicIds == ["topic-llms"]
    assert [s.url for s in result.events[0].sources] == ["https://example.com/llm-benchmark"]
    assert result.events[0].sources[0].sourceName == "Example News"
    assert result.events[0].sources[0].provider == "gnews"
    assert result.events[0].sources[0].publishedAt == datetime(2026, 6, 3, 12, 0, tzinfo=timezone.utc)
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
async def test_generate_digest_sanitizes_generated_prose_without_retrying(mock_build_chain):
    chain = AsyncMock()
    chain.ainvoke.return_value = DigestLlmOutput(
        topStorySubtitle="🚀 LLM benchmarking led today's AI updates.",
        summary="New model evaluation work shaped the day. 📊",
        events=[
            DigestLlmEvent(
                headline="🧪 New GPT-4o benchmark compares long-context behavior",
                summaryBullets=["The benchmark reports a 3.5% improvement. ✅"],
                topicKeys=["t1"],
                sourceIds=["s1"],
            )
        ],
    )
    mock_build_chain.return_value = (chain, "test-model")

    result = await generate_digest(_request(), [_source()])

    assert result.topStorySubtitle == "LLM benchmarking led today's AI updates."
    assert result.summary == "New model evaluation work shaped the day."
    assert result.events[0].headline == "New GPT-4o benchmark compares long-context behavior"
    assert result.events[0].summaryBullets == ["The benchmark reports a 3.5% improvement."]
    assert chain.ainvoke.await_count == 1


@pytest.mark.asyncio
@patch("app.services.digest_generator._build_digest_chain")
async def test_generate_digest_retries_empty_required_prose_and_aggregates_usage(mock_build_chain):
    invalid = DigestLlmOutput(
        topStorySubtitle="🚀",
        summary="New model evaluation work shaped the day.",
        events=[
            DigestLlmEvent(
                headline="New LLM benchmark compares long-context behavior",
                summaryBullets=["The benchmark highlights retrieval quality."],
                topicKeys=["t1"],
                sourceIds=["s1"],
            )
        ],
    )
    valid = invalid.model_copy(update={"topStorySubtitle": "LLM benchmarking led today's updates."})
    chain = AsyncMock()
    chain.ainvoke.side_effect = [
        {
            "raw": SimpleNamespace(
                usage_metadata={"input_tokens": 100, "output_tokens": 40, "total_tokens": 140}
            ),
            "parsed": invalid,
            "parsing_error": None,
        },
        {
            "raw": SimpleNamespace(
                usage_metadata={"input_tokens": 110, "output_tokens": 50, "total_tokens": 160}
            ),
            "parsed": valid,
            "parsing_error": None,
        },
    ]
    mock_build_chain.return_value = (chain, "test-model")

    result = await generate_digest(_request(), [_source()])

    assert result.topStorySubtitle == "LLM benchmarking led today's updates."
    assert chain.ainvoke.await_count == 2
    assert result.usage is not None
    assert result.usage.input_tokens == 210
    assert result.usage.output_tokens == 90
    assert result.usage.total_tokens == 300
    retry_input = chain.ainvoke.await_args_list[1].args[0]
    assert "previous response" in retry_input["retry_instruction"]
    assert "without emoji" in retry_input["retry_instruction"]


@pytest.mark.asyncio
@patch("app.services.digest_generator._build_digest_chain")
async def test_generate_digest_fails_after_two_invalid_sanitized_outputs(mock_build_chain):
    invalid = DigestLlmOutput(
        topStorySubtitle="Daily AI updates.",
        summary="🚀",
        events=[
            DigestLlmEvent(
                headline="Benchmark results",
                summaryBullets=["🧪"],
                topicKeys=["t1"],
                sourceIds=["s1"],
            )
        ],
    )
    chain = AsyncMock()
    chain.ainvoke.side_effect = [invalid, invalid]
    mock_build_chain.return_value = (chain, "test-model")

    with pytest.raises(InvalidLlmOutputError, match="summary"):
        await generate_digest(_request(), [_source()])

    assert chain.ainvoke.await_count == 2


@pytest.mark.asyncio
@patch("app.services.digest_generator._build_digest_chain")
async def test_generate_digest_reports_no_usage_when_retry_usage_is_incomplete(mock_build_chain):
    invalid = DigestLlmOutput(
        topStorySubtitle="🚀",
        summary="Daily AI summary.",
        events=[
            DigestLlmEvent(
                headline="Benchmark results",
                summaryBullets=["Retrieval quality improved."],
                topicKeys=["t1"],
                sourceIds=["s1"],
            )
        ],
    )
    valid = invalid.model_copy(update={"topStorySubtitle": "Daily AI updates."})
    chain = AsyncMock()
    chain.ainvoke.side_effect = [
        invalid,
        {
            "raw": SimpleNamespace(
                usage_metadata={"input_tokens": 110, "output_tokens": 50, "total_tokens": 160}
            ),
            "parsed": valid,
            "parsing_error": None,
        },
    ]
    mock_build_chain.return_value = (chain, "test-model")

    result = await generate_digest(_request(), [_source()])

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
    assert chain.ainvoke.await_count == 1


@pytest.mark.asyncio
@patch("app.services.digest_generator._build_digest_chain")
async def test_generate_digest_rejects_partially_invalid_references(mock_build_chain):
    chain = AsyncMock()
    chain.ainvoke.return_value = DigestLlmOutput(
        topStorySubtitle="LLM benchmarking led today's AI updates.",
        summary="New model evaluation work shaped the day.",
        events=[
            DigestLlmEvent(
                headline="New LLM benchmark compares long-context behavior",
                summaryBullets=["The benchmark highlights differences in retrieval quality."],
                topicKeys=["t1", "invented-topic"],
                sourceIds=["s1", "invented-source"],
            )
        ],
    )
    mock_build_chain.return_value = (chain, "test-model")

    with pytest.raises(DigestJsonParseError, match="invalid topicKeys or sourceIds"):
        await generate_digest(_request(), [_source()])
    assert chain.ainvoke.await_count == 1


@pytest.mark.asyncio
@patch("app.services.digest_generator._build_digest_chain")
async def test_generate_digest_rejects_invalid_topic_keys(mock_build_chain):
    chain = AsyncMock()
    chain.ainvoke.return_value = DigestLlmOutput(
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
    assert chain.ainvoke.await_count == 1

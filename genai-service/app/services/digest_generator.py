"""
LLM-backed daily digest generation.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field, ValidationError

from app.config import get_settings
from app.schemas.digest import DigestEvent, DigestGenerateRequest, DigestGenerateResponse
from app.schemas.summarize import TokenUsage
from app.services.external_sources import ExternalSourceItem
from app.services.summarizer import _get_llm

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are a daily digest writer for Verita, an AI knowledge-sharing platform.

Use only the provided external sources.

Rules:
- Summarize what newly happened during the requested period.
- Sources are grouped by subscribed topic.
- Create at most {max_events} events.
- Each event must cite one or more sourceIds from the provided sources.
- When combining multiple sources into one event, include every combined source ID in that event's sourceIds.
- Each event's topicKeys must contain only topic keys from the provided topics.
- Prefer combining related sources into one event, but do not cite unrelated sources just to increase citation count.
- Do not invent facts, source IDs, topic keys, or source names.
- If evidence is weak or uncertain, say so briefly.
- The digest tone should be {tone}.
"""


class DigestJsonParseError(Exception):
    """Raised when the LLM response cannot be parsed into the digest schema."""


class DigestLlmEvent(BaseModel):
    """Structured event shape requested from the LLM."""

    headline: str
    summaryBullets: list[str] = Field(..., min_length=1, max_length=3)
    topicKeys: list[str] = Field(..., min_length=1)
    sourceIds: list[str] = Field(..., min_length=1)


class DigestLlmOutput(BaseModel):
    """Structured digest shape requested from the LLM."""

    title: str
    topStorySubtitle: str
    summary: str
    events: list[DigestLlmEvent] = Field(..., min_length=1, max_length=20)


def _build_digest_chain():
    settings = get_settings()
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            ("human", "{input_json}"),
        ]
    )
    llm = _get_llm(settings)
    structured_llm = llm.with_structured_output(DigestLlmOutput)
    return prompt | structured_llm, settings.llm_model


async def generate_digest(
    request: DigestGenerateRequest,
    sources: list[ExternalSourceItem],
) -> DigestGenerateResponse:
    """Generate the final digest using selected, grouped source snippets."""
    chain, model_name = _build_digest_chain()
    input_json, source_by_id, topic_id_by_key = _build_llm_input_json(request, sources)

    logger.info("Generating digest from %d selected sources", len(sources))
    logger.debug(
        "Digest LLM request systemPrompt=%s inputJson=%s",
        SYSTEM_PROMPT.format(max_events=request.maxEvents, tone=request.tone),
        input_json,
    )
    structured_result = await chain.ainvoke(
        {
            "input_json": input_json,
            "max_events": request.maxEvents,
            "tone": request.tone,
        }
    )
    logger.debug("Digest LLM raw structured response=%s", _format_llm_debug_payload(structured_result))
    payload, raw_message = _extract_structured_digest(structured_result)

    try:
        events = [
            _build_event(event_payload, source_by_id, topic_id_by_key)
            for event_payload in payload.events
        ][: request.maxEvents]
    except ValidationError as exc:
        raise DigestJsonParseError(str(exc)) from exc

    cited_source_count = len({url for event in events for url in event.sourceUrls})
    logger.info(
        "Digest LLM structured output accepted generatedEventCount=%d acceptedEventCount=%d sourceCount=%d citedSourceCount=%d",
        len(payload.events),
        len(events),
        len(sources),
        cited_source_count,
    )
    usage = _extract_usage(raw_message)
    return DigestGenerateResponse(
        digestDate=request.digestDate,
        periodStart=request.periodStart,
        periodEnd=request.periodEnd,
        title=payload.title or f"Your {request.digestDate.isoformat()} AI Digest",
        topStorySubtitle=payload.topStorySubtitle or "New AI developments across subscribed topics.",
        summary=payload.summary or "",
        topics=request.topics,
        events=events,
        eventCount=len(events),
        sourceCount=len(sources),
        readTimeMinutes=_estimate_read_time(payload, events),
        generatedAt=datetime.now(timezone.utc),
        model=model_name,
        usage=usage,
    )


def _extract_structured_digest(result: Any) -> tuple[DigestLlmOutput, Any | None]:
    if isinstance(result, DigestLlmOutput):
        return result, None

    if not isinstance(result, dict):
        raise DigestJsonParseError(f"LLM returned unsupported structured output type: {type(result)}")

    parsing_error = result.get("parsing_error")
    if parsing_error:
        raise DigestJsonParseError(f"LLM returned invalid structured digest output: {parsing_error}")

    parsed = result.get("parsed")
    raw_message = result.get("raw")
    if isinstance(parsed, DigestLlmOutput):
        return parsed, raw_message

    try:
        return DigestLlmOutput.model_validate(parsed), raw_message
    except ValidationError as exc:
        raise DigestJsonParseError(str(exc)) from exc


def _build_llm_input_json(
    request: DigestGenerateRequest,
    sources: list[ExternalSourceItem],
) -> tuple[str, dict[str, ExternalSourceItem], dict[str, str]]:
    source_by_id: dict[str, ExternalSourceItem] = {}
    topic_key_by_id = {topic.id: f"t{index}" for index, topic in enumerate(request.topics, start=1)}
    topic_id_by_key = {topic_key: topic_id for topic_id, topic_key in topic_key_by_id.items()}
    by_topic: dict[str, list[dict[str, Any]]] = {topic.id: [] for topic in request.topics}
    for index, source in enumerate(sources, start=1):
        source_id = f"s{index}"
        source_by_id[source_id] = source
        by_topic.setdefault(source.topicId, []).append(
            {
                "sourceId": source_id,
                "provider": source.provider,
                "title": source.title,
                "snippet": source.snippet,
                "publishedAt": source.publishedAt.isoformat(),
                "sourceName": source.sourceName,
            }
        )

    topics = []
    for topic in request.topics:
        topic_sources = by_topic.get(topic.id, [])
        if topic_sources:
            topics.append({"topicKey": topic_key_by_id[topic.id], "name": topic.name, "sources": topic_sources})

    return (
        json.dumps(
            {
                "digestDate": request.digestDate.isoformat(),
                "periodStart": request.periodStart.isoformat(),
                "periodEnd": request.periodEnd.isoformat(),
                "topics": topics,
            },
            ensure_ascii=True,
        ),
        source_by_id,
        topic_id_by_key,
    )


def _format_llm_debug_payload(payload: Any) -> str:
    if isinstance(payload, BaseModel):
        return payload.model_dump_json()
    try:
        return json.dumps(payload, default=str, ensure_ascii=True)
    except TypeError:
        return str(payload)


def _build_event(
    payload: DigestLlmEvent,
    source_by_id: dict[str, ExternalSourceItem],
    topic_id_by_key: dict[str, str],
) -> DigestEvent:
    topic_ids = [topic_id_by_key[topic_key] for topic_key in payload.topicKeys if topic_key in topic_id_by_key]
    source_urls = [source_by_id[source_id].url for source_id in payload.sourceIds if source_id in source_by_id]
    if not topic_ids or not source_urls:
        raise DigestJsonParseError("Digest event contains invalid topicKeys or sourceIds")
    return DigestEvent(
        headline=payload.headline,
        summaryBullets=[bullet for bullet in payload.summaryBullets if bullet.strip()],
        topicIds=topic_ids,
        sourceUrls=source_urls,
    )


def _extract_usage(ai_message) -> TokenUsage | None:
    if hasattr(ai_message, "usage_metadata") and ai_message.usage_metadata:
        usage = ai_message.usage_metadata
        return TokenUsage(
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
        )
    return None


def _estimate_read_time(payload: DigestLlmOutput, events: list[DigestEvent]) -> int:
    text = " ".join(
        [
            payload.title,
            payload.topStorySubtitle,
            payload.summary,
            " ".join(event.headline for event in events),
            " ".join(" ".join(event.summaryBullets) for event in events),
        ]
    )
    words = len(text.split())
    return max(1, round(words / 220))

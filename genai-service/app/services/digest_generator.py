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

from app.schemas.digest import DigestEvent, DigestGenerateRequest, DigestGenerateResponse, DigestSource
from app.schemas.summarize import TokenUsage
from app.services.external_sources import ExternalSourceItem
from app.services.llm_config import active_settings
from app.services.llm_usage import aggregate_usage, extract_usage
from app.services.output_sanitizer import InvalidLlmOutputError, sanitize_text
from app.services.summarizer import _get_llm

logger = logging.getLogger(__name__)
MAX_LLM_ATTEMPTS = 2
RETRY_INSTRUCTION = (
    "Regenerate the complete digest. The previous response had required prose that became empty "
    "after sanitization. Use ordinary text without emoji in every required prose field."
)

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
- Do not use emoji in any generated prose.
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

    topStorySubtitle: str
    summary: str
    events: list[DigestLlmEvent] = Field(..., min_length=1, max_length=20)


def _build_digest_chain():
    settings = active_settings()
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            ("human", "{input_json}\n{retry_instruction}"),
        ]
    )
    llm = _get_llm(settings)
    structured_output_options = {"include_raw": True}
    if settings.llm_provider.lower() == "ollama":
        structured_output_options["method"] = "json_schema"
    structured_llm = llm.with_structured_output(
        DigestLlmOutput, **structured_output_options
    )
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
    attempt_usage: list[TokenUsage | None] = []
    for attempt in range(1, MAX_LLM_ATTEMPTS + 1):
        structured_result = await chain.ainvoke(
            {
                "input_json": input_json,
                "max_events": request.maxEvents,
                "tone": request.tone,
                "retry_instruction": RETRY_INSTRUCTION if attempt > 1 else "",
            }
        )
        logger.debug(
            "Digest LLM structured response received type=%s",
            type(structured_result).__name__,
        )
        payload, raw_message = _extract_structured_digest(structured_result)
        attempt_usage.append(extract_usage(raw_message))
        payload = _sanitize_digest_payload(payload)
        try:
            _validate_required_digest_prose(payload)
        except InvalidLlmOutputError as exc:
            logger.warning(
                "Digest LLM sanitized output invalid attempt=%d maxAttempts=%d reason=%s",
                attempt,
                MAX_LLM_ATTEMPTS,
                exc,
            )
            if attempt < MAX_LLM_ATTEMPTS:
                continue
            raise

        try:
            events = [
                _build_event(event_payload, source_by_id, topic_id_by_key)
                for event_payload in payload.events
            ][: request.maxEvents]
        except ValidationError as exc:
            raise DigestJsonParseError(str(exc)) from exc

        cited_source_count = len({source.url for event in events for source in event.sources})
        logger.info(
            "Digest LLM structured output accepted generatedEventCount=%d acceptedEventCount=%d sourceCount=%d citedSourceCount=%d",
            len(payload.events),
            len(events),
            len(sources),
            cited_source_count,
        )
        return DigestGenerateResponse(
            digestDate=request.digestDate,
            periodStart=request.periodStart,
            periodEnd=request.periodEnd,
            topStorySubtitle=payload.topStorySubtitle,
            summary=payload.summary,
            topics=request.topics,
            events=events,
            eventCount=len(events),
            sourceCount=len(sources),
            readTimeMinutes=_estimate_read_time(payload, events),
            generatedAt=datetime.now(timezone.utc),
            model=model_name,
            usage=aggregate_usage(attempt_usage),
        )

    raise AssertionError("Digest LLM attempt loop exited unexpectedly")


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


def _build_event(
    payload: DigestLlmEvent,
    source_by_id: dict[str, ExternalSourceItem],
    topic_id_by_key: dict[str, str],
) -> DigestEvent:
    if any(topic_key not in topic_id_by_key for topic_key in payload.topicKeys) or any(
        source_id not in source_by_id for source_id in payload.sourceIds
    ):
        raise DigestJsonParseError("Digest event contains invalid topicKeys or sourceIds")

    topic_ids = [topic_id_by_key[topic_key] for topic_key in payload.topicKeys]
    sources = [
        DigestSource(
            url=item.url,
            sourceName=item.sourceName,
            provider=item.provider,
            publishedAt=item.publishedAt,
            title=item.title,
        )
        for source_id in payload.sourceIds
        if (item := source_by_id.get(source_id)) is not None
    ]
    return DigestEvent(
        headline=payload.headline,
        summaryBullets=[bullet for bullet in payload.summaryBullets if bullet.strip()],
        topicIds=topic_ids,
        sources=sources,
    )


def _sanitize_digest_payload(payload: DigestLlmOutput) -> DigestLlmOutput:
    changed_fields: list[str] = []
    events = []
    for index, event in enumerate(payload.events):
        headline = sanitize_text(event.headline)
        bullets = [cleaned for bullet in event.summaryBullets if (cleaned := sanitize_text(bullet))]
        if headline != event.headline:
            changed_fields.append(f"events[{index}].headline")
        if bullets != event.summaryBullets:
            changed_fields.append(f"events[{index}].summaryBullets")
        events.append(event.model_copy(update={"headline": headline, "summaryBullets": bullets}))

    subtitle = sanitize_text(payload.topStorySubtitle)
    summary = sanitize_text(payload.summary)
    if subtitle != payload.topStorySubtitle:
        changed_fields.append("topStorySubtitle")
    if summary != payload.summary:
        changed_fields.append("summary")
    if changed_fields:
        logger.info("Sanitized digest LLM prose fields=%s", changed_fields)
    return payload.model_copy(
        update={"topStorySubtitle": subtitle, "summary": summary, "events": events}
    )


def _validate_required_digest_prose(payload: DigestLlmOutput) -> None:
    empty_fields = []
    if not payload.topStorySubtitle:
        empty_fields.append("topStorySubtitle")
    if not payload.summary:
        empty_fields.append("summary")
    for index, event in enumerate(payload.events):
        if not event.headline:
            empty_fields.append(f"events[{index}].headline")
        if not event.summaryBullets:
            empty_fields.append(f"events[{index}].summaryBullets")
    if empty_fields:
        raise InvalidLlmOutputError(
            f"Digest LLM output has empty required prose fields: {', '.join(empty_fields)}"
        )


def _estimate_read_time(payload: DigestLlmOutput, events: list[DigestEvent]) -> int:
    text = " ".join(
        [
            payload.topStorySubtitle,
            payload.summary,
            " ".join(event.headline for event in events),
            " ".join(" ".join(event.summaryBullets) for event in events),
        ]
    )
    words = len(text.split())
    return max(1, round(words / 220))

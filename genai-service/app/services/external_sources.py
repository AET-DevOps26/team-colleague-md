"""
External source fetching and selection for daily digest generation.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
import logging
import re
from typing import Any, cast

import httpx
from pydantic import BaseModel

from app.config import get_settings
from app.schemas.digest import DigestGenerateRequest, DigestJobWarning, DigestTopic, DigestWarningProvider
from app.services.output_sanitizer import sanitize_text

logger = logging.getLogger(__name__)

SNIPPET_MAX_CHARS = 400
MAX_TOTAL_SOURCES = 30
PROVIDER_PRIORITY = ["huggingface", "gnews", "github"]
SMART_PUNCTUATION = str.maketrans(
    {
        "\u2026": "...",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
    }
)

CURATED_GITHUB_REPOS = [
    {"repo": "langchain-ai/langchain", "topics": ["ai agents", "rag", "llm apps", "langchain"]},
    {"repo": "microsoft/autogen", "topics": ["ai agents", "multi-agent", "agent framework"]},
    {"repo": "openai/openai-agents-python", "topics": ["ai agents", "openai", "agent sdk"]},
    {"repo": "huggingface/transformers", "topics": ["llms", "transformers", "models"]},
    {"repo": "vllm-project/vllm", "topics": ["llms", "inference", "serving"]},
    {"repo": "ollama/ollama", "topics": ["llms", "local models", "inference"]},
    {"repo": "run-llama/llama_index", "topics": ["rag", "llm apps", "llamaindex"]},
]

CURATED_HF_NAMESPACES = {
    "meta-llama",
    "mistralai",
    "qwen",
    "deepseek-ai",
    "google",
    "microsoft",
    "openai",
    "anthropic",
    "huggingface",
    "stabilityai",
    "allenai",
    "bigscience",
}

HF_NOISY_PATTERNS = [
    "gguf",
    "quantized",
    "awq",
    "gptq",
    "lora",
    "adapter",
    "merge",
    "fp16",
    "int4",
    "int8",
    "4bit",
    "8bit",
]


class ExternalSourceItem(BaseModel):
    """Normalized source item sent to the digest LLM prompt."""

    provider: str
    topicId: str
    topicName: str
    title: str
    snippet: str
    url: str
    publishedAt: datetime
    sourceName: str | None = None


async def fetch_and_select_sources(
    request: DigestGenerateRequest,
) -> tuple[list[ExternalSourceItem], list[DigestJobWarning]]:
    """Fetch external sources and reduce them to the selected prompt set."""
    settings = get_settings()
    warnings: list[DigestJobWarning] = []
    by_topic: dict[str, list[ExternalSourceItem]] = {}
    gnews_missing_warned = False

    timeout = httpx.Timeout(10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        for topic in request.topics:
            candidates: list[ExternalSourceItem] = []
            for provider, fetcher in (
                ("github", _fetch_github_sources),
                ("gnews", _fetch_gnews_sources),
                ("huggingface", _fetch_huggingface_sources),
            ):
                if provider == "gnews" and not settings.gnews_api_key:
                    if not gnews_missing_warned:
                        logger.warning("Digest source provider skipped provider=gnews reason=missing_credentials")
                        warnings.append(
                            DigestJobWarning(
                                provider="gnews",
                                code="missing_credentials",
                                message="GNEWS_API_KEY is not configured; skipped GNews source fetch.",
                            )
                        )
                        gnews_missing_warned = True
                    continue
                try:
                    logger.debug(
                        "Digest source provider fetch started provider=%s topicId=%s topicName=%s",
                        provider,
                        topic.id,
                        topic.name,
                    )
                    items, provider_warnings = await fetcher(client, request, topic)
                    logger.info(
                        "Digest source provider fetch completed provider=%s topicId=%s topicName=%s itemCount=%d warningCount=%d",
                        provider,
                        topic.id,
                        topic.name,
                        len(items),
                        len(provider_warnings),
                    )
                    warnings.extend(provider_warnings)
                    candidates.extend(items)
                except Exception as exc:
                    logger.warning("%s fetch failed for topic %s: %s", provider, topic.name, exc)
                    warnings.append(
                        DigestJobWarning(
                            provider=cast(DigestWarningProvider, provider),
                            topicId=topic.id,
                            code="provider_error",
                            message=f"{provider} source fetch failed for topic '{topic.name}'.",
                        )
                    )

            selected = _select_topic_sources(candidates, request.maxSourcesPerTopic)
            logger.info(
                "Digest source topic selection completed topicId=%s topicName=%s candidateCount=%d selectedCount=%d selectedProviderCounts=%s",
                topic.id,
                topic.name,
                len(candidates),
                len(selected),
                dict(Counter(source.provider for source in selected)),
            )
            if selected:
                by_topic[topic.id] = selected
            else:
                warnings.append(
                    DigestJobWarning(
                        provider="all",
                        topicId=topic.id,
                        code="no_sources_for_topic",
                        message=f"No external sources were found for topic '{topic.name}'.",
                    )
                )

    selected_sources = _cap_total_sources(by_topic)
    logger.info(
        "Digest source selection completed topicCount=%d selectedCount=%d totalCap=%d providerCounts=%s warningCount=%d",
        len(request.topics),
        len(selected_sources),
        MAX_TOTAL_SOURCES,
        dict(Counter(source.provider for source in selected_sources)),
        len(warnings),
    )
    return selected_sources, warnings


async def _fetch_github_sources(
    client: httpx.AsyncClient,
    request: DigestGenerateRequest,
    topic: DigestTopic,
) -> tuple[list[ExternalSourceItem], list[DigestJobWarning]]:
    settings = get_settings()
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if settings.github_token:
        headers["Authorization"] = f"Bearer {settings.github_token}"

    repos = _matching_github_repos(topic.name)
    items: list[ExternalSourceItem] = []
    for repo in repos:
        releases = await _github_get(
            client,
            f"https://api.github.com/repos/{repo}/releases",
            headers,
            {"per_page": request.maxSourcesPerTopic},
        )
        for release in releases if isinstance(releases, list) else []:
            published_at = _parse_datetime(release.get("published_at") or release.get("created_at"))
            if not published_at or not _in_period(published_at, request):
                continue
            title = release.get("name") or release.get("tag_name") or f"{repo} release"
            title = _clean_text(title)
            snippet = _clean_snippet(release.get("body") or title)
            url = release.get("html_url")
            if not title or not snippet or not url:
                continue
            items.append(
                ExternalSourceItem(
                    provider="github",
                    topicId=topic.id,
                    topicName=topic.name,
                    title=f"{repo}: {title}",
                    snippet=snippet,
                    url=url,
                    publishedAt=published_at,
                    sourceName=repo,
                )
            )

        since = request.periodStart.date().isoformat()
        until = request.periodEnd.date().isoformat()
        query = f'repo:{repo} is:pr is:merged "{topic.name}" merged:{since}..{until}'
        response = await _github_get(
            client,
            "https://api.github.com/search/issues",
            headers,
            {"q": query, "sort": "updated", "order": "desc", "per_page": request.maxSourcesPerTopic},
        )
        for pr in response.get("items", []) if isinstance(response, dict) else []:
            published_at = _parse_datetime(pr.get("closed_at") or pr.get("updated_at") or pr.get("created_at"))
            if not published_at or not _in_period(published_at, request):
                continue
            snippet = _clean_snippet(pr.get("body") or pr.get("title"))
            title = _clean_text(pr.get("title"))
            url = pr.get("html_url")
            if not title or not snippet or not url:
                continue
            items.append(
                ExternalSourceItem(
                    provider="github",
                    topicId=topic.id,
                    topicName=topic.name,
                    title=f"{repo}: {title}",
                    snippet=snippet,
                    url=url,
                    publishedAt=published_at,
                    sourceName=repo,
                )
            )

    return _valid_items(items), []


async def _fetch_gnews_sources(
    client: httpx.AsyncClient,
    request: DigestGenerateRequest,
    topic: DigestTopic,
) -> tuple[list[ExternalSourceItem], list[DigestJobWarning]]:
    settings = get_settings()
    if not settings.gnews_api_key:
        return [], [
            DigestJobWarning(
                provider="gnews",
                code="missing_credentials",
                message="GNEWS_API_KEY is not configured; skipped GNews source fetch.",
            )
        ]

    response = await client.get(
        "https://gnews.io/api/v4/search",
        params={
            "q": topic.name,
            "from": _format_gnews_datetime(request.periodStart),
            "to": _format_gnews_datetime(request.periodEnd),
            "lang": "en",
            "in": "title,description",
            "sortby": "publishedAt",
            "max": min(request.maxSourcesPerTopic, 10),
            "apikey": settings.gnews_api_key,
        },
    )
    response.raise_for_status()
    articles = response.json().get("articles", [])

    items: list[ExternalSourceItem] = []
    for article in articles:
        title = article.get("title")
        url = article.get("url")
        snippet = _clean_snippet(article.get("description") or article.get("content"))
        published_at = _parse_datetime(article.get("publishedAt"))
        if not title or not url or not snippet or title == "[Removed]" or not published_at:
            continue
        items.append(
            ExternalSourceItem(
                provider="gnews",
                topicId=topic.id,
                topicName=topic.name,
                title=_clean_text(title),
                snippet=snippet,
                url=url,
                publishedAt=published_at,
                sourceName=(article.get("source") or {}).get("name"),
            )
        )

    return _valid_items(items), []


async def _fetch_huggingface_sources(
    client: httpx.AsyncClient,
    request: DigestGenerateRequest,
    topic: DigestTopic,
) -> tuple[list[ExternalSourceItem], list[DigestJobWarning]]:
    items: list[ExternalSourceItem] = []
    for kind, endpoint in (("model", "models"), ("dataset", "datasets")):
        response = await client.get(
            f"https://huggingface.co/api/{endpoint}",
            params={
                "search": topic.name,
                "sort": "lastModified",
                "direction": "-1",
                "limit": request.maxSourcesPerTopic,
            },
        )
        response.raise_for_status()
        for item in response.json():
            repo_id = item.get("modelId") or item.get("id")
            if not repo_id or not _is_curated_hf_repo(repo_id) or _is_noisy_hf_repo(repo_id):
                continue
            published_at = _parse_datetime(item.get("lastModified"))
            if not published_at or not _in_period(published_at, request):
                continue
            tags = item.get("tags") or []
            snippet = _clean_snippet(
                f"Hugging Face {kind} updated recently. Tags: {', '.join(tags[:8])}"
            )
            items.append(
                ExternalSourceItem(
                    provider="huggingface",
                    topicId=topic.id,
                    topicName=topic.name,
                    title=_clean_text(repo_id),
                    snippet=snippet,
                    url=f"https://huggingface.co/{repo_id}",
                    publishedAt=published_at,
                    sourceName=f"Hugging Face {kind}s",
                )
            )

    return _valid_items(items), []


async def _github_get(
    client: httpx.AsyncClient,
    url: str,
    headers: dict[str, str],
    params: dict[str, Any],
) -> Any:
    response = await client.get(url, headers=headers, params=params)
    response.raise_for_status()
    return response.json()


def _matching_github_repos(topic_name: str) -> list[str]:
    normalized = _normalize(topic_name)
    repos = []
    for repo in CURATED_GITHUB_REPOS:
        for repo_topic in repo["topics"]:
            normalized_repo_topic = _normalize(repo_topic)
            if normalized in normalized_repo_topic or normalized_repo_topic in normalized:
                repos.append(repo["repo"])
                break
    return repos


def _select_topic_sources(
    candidates: list[ExternalSourceItem],
    max_sources: int,
) -> list[ExternalSourceItem]:
    by_url: dict[str, ExternalSourceItem] = {}
    for item in candidates:
        by_url.setdefault(item.url, item)

    by_provider: dict[str, list[ExternalSourceItem]] = {provider: [] for provider in PROVIDER_PRIORITY}
    for item in by_url.values():
        by_provider.setdefault(item.provider, []).append(item)
    for items in by_provider.values():
        items.sort(key=lambda item: item.publishedAt, reverse=True)

    selected: list[ExternalSourceItem] = []
    while len(selected) < max_sources:
        picked_any = False
        for provider in PROVIDER_PRIORITY:
            provider_items = by_provider.get(provider, [])
            if provider_items and len(selected) < max_sources:
                selected.append(provider_items.pop(0))
                picked_any = True
        if not picked_any:
            break
    return selected


def _cap_total_sources(by_topic: dict[str, list[ExternalSourceItem]]) -> list[ExternalSourceItem]:
    selected: list[ExternalSourceItem] = []
    topic_ids = list(by_topic.keys())
    while len(selected) < MAX_TOTAL_SOURCES:
        picked_any = False
        for topic_id in topic_ids:
            items = by_topic[topic_id]
            if items and len(selected) < MAX_TOTAL_SOURCES:
                selected.append(items.pop(0))
                picked_any = True
        if not picked_any:
            break
    return selected


def _valid_items(items: list[ExternalSourceItem]) -> list[ExternalSourceItem]:
    return [item for item in items if item.title and item.snippet and item.url]


def _clean_snippet(value: str | None) -> str:
    cleaned = _clean_text(value)
    return cleaned[:SNIPPET_MAX_CHARS]


def _clean_text(value: str | None) -> str:
    if not value:
        return ""
    text = unescape(re.sub(r"<[^>]+>", " ", value))
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"[`*_>#]+", " ", text)
    text = re.sub(r"\s[-*]\s", " ", text)
    text = text.translate(SMART_PUNCTUATION)
    return sanitize_text(text)
def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        return datetime.fromisoformat(value)
    except ValueError:
        try:
            return parsedate_to_datetime(value)
        except (TypeError, ValueError):
            return None


def _in_period(value: datetime, request: DigestGenerateRequest) -> bool:
    value_utc = _as_utc(value)
    return _as_utc(request.periodStart) <= value_utc < _as_utc(request.periodEnd)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _format_gnews_datetime(value: datetime) -> str:
    return _as_utc(value).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _is_curated_hf_repo(repo_id: str) -> bool:
    owner = repo_id.split("/", 1)[0].lower()
    return owner in CURATED_HF_NAMESPACES


def _is_noisy_hf_repo(repo_id: str) -> bool:
    normalized = repo_id.lower()
    return any(pattern in normalized for pattern in HF_NOISY_PATTERNS)


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()

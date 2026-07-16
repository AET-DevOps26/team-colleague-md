"""
Summarizer service — LangChain LCEL chain for post summarization.

This module is the equivalent of a Spring @Service class. It contains
the business logic for summarizing post content using an LLM.

Architecture:
    prompt (ChatPromptTemplate)
      |
    model (ChatGoogleGenerativeAI)
      |
    parser (StrOutputParser)
      → 3-bullet summary string
"""

import logging
import re

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_nvidia_ai_endpoints import ChatNVIDIA

from app.schemas.summarize import SummarizeRequest, SummarizeResponse, TokenUsage
from app.services.llm_config import active_settings
from app.services.llm_usage import aggregate_usage, extract_usage
from app.services.output_sanitizer import InvalidLlmOutputError, sanitize_text

logger = logging.getLogger(__name__)
MAX_LLM_ATTEMPTS = 2
RETRY_INSTRUCTION = (
    "Regenerate the complete summary. The previous response became empty after sanitization. "
    "Return ordinary text without emoji in every summary bullet."
)

# ---------------------------------------------------------------------------
# System prompt — instructs the LLM to produce 3 to 5 bullet points.
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """\
You are a concise summarization assistant for an AI knowledge-sharing platform called Verita.

Your task is to summarize user-submitted posts into 3 to 5 bullet points.

Rules:
- Output 3 to 5 bullet points, each starting with "• ".
- Each bullet should be one sentence (max ~25 words).
- Focus on the most important facts, findings, or takeaways.
- Use clear, technical language appropriate for AI practitioners.
- Do NOT include introductory phrases like "Here is a summary".
- Do NOT use markdown formatting other than the bullet character "• ".
- Do NOT use emoji in any summary bullet.
- If a title is provided, use it as context but do not repeat it.

Example output format:
• First key point about the post content
• Second key point about the post content
• Third key point about the post content\
"""


def _build_chain():
    """
    Build the LCEL summarization chain.

    Chain composition:
        prompt | model | parser

    The chain is built fresh on each call rather than cached at module level,
    so that config changes (e.g., an admin's runtime provider swap, ADR-0020) are
    picked up without restart.
    """
    settings = active_settings()

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            ("human", "{input_text}\n{retry_instruction}"),
        ]
    )

    model = _get_llm(settings)

    # We do not use StrOutputParser here because we want to preserve
    # the AIMessage output which contains the token usage_metadata.
    return prompt | model, settings.llm_model


def _get_llm(settings):
    """
    LLM Factory: returns the correct LangChain model based on the provider config.
    """
    provider = settings.llm_provider.lower()

    if provider == "openrouter":
        return ChatOpenAI(
            model=settings.llm_model,
            api_key=settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
            temperature=settings.llm_temperature,
        )
    elif provider == "logos":
        return ChatOpenAI(
            model=settings.llm_model,
            api_key=settings.logos_api_key,
            base_url="https://logos.aet.cit.tum.de/v1",
            temperature=settings.llm_temperature,
        )
    elif provider == "ollama":
        return ChatOpenAI(
            model=settings.llm_model,
            api_key="ollama",
            base_url=settings.ollama_base_url.strip(),
            temperature=settings.llm_temperature,
        )
    elif provider == "nvidia":
        return ChatNVIDIA(
            model=settings.llm_model,
            api_key=settings.nvidia_nim_api_key,
            temperature=settings.llm_temperature,
        )
    elif provider == "google":
        return ChatGoogleGenerativeAI(
            model=settings.llm_model,
            google_api_key=settings.google_api_key,
            temperature=settings.llm_temperature,
        )
    else:
        raise ValueError(f"Unsupported LLM provider: {settings.llm_provider}")


def _format_input(request: SummarizeRequest) -> str:
    """
    Format the request into the human message for the prompt.

    If a title is provided, it is prepended to give the LLM
    additional context about the post.
    """
    if request.title:
        return f"Title: {request.title}\n\nContent:\n{request.content}"
    return request.content


def _parse_bullets(raw_output: str) -> list[str]:
    """
    Parse the raw LLM output into a list of bullet-point strings.

    Handles various bullet formats the LLM might return:
    - "• " (intended format)
    - "- " (common fallback)
    - "* " (markdown style)
    - Numbered lists "1. ", "2. ", "3. "

    Returns up to 5 bullets. If the LLM returns more, truncates.
    """
    # Split by common bullet patterns
    lines = raw_output.strip().split("\n")

    bullets = []
    for line in lines:
        # Strip bullet characters and whitespace
        cleaned = re.sub(r"^[\s]*[•\-\*]\s*", "", line.strip())
        cleaned = re.sub(r"^[\s]*\d+[.)]\s*", "", cleaned)

        if cleaned:
            bullets.append(cleaned)

    return bullets[:5]


async def summarize(request: SummarizeRequest) -> SummarizeResponse:
    """
    Summarize post content using the LangChain LCEL chain.

    Args:
        request: The summarization request containing post content and optional title.

    Returns:
        SummarizeResponse with 3 to 5 summary bullets, model name, and token usage.

    Raises:
        Exception: If the LLM call fails (caught by the router for error handling).
    """
    chain, model_name = _build_chain()
    input_text = _format_input(request)

    logger.info("Summarizing content (length=%d, model=%s)", len(request.content), model_name)

    attempt_usage: list[TokenUsage | None] = []
    for attempt in range(1, MAX_LLM_ATTEMPTS + 1):
        ai_message = await chain.ainvoke(
            {
                "input_text": input_text,
                "retry_instruction": RETRY_INSTRUCTION if attempt > 1 else "",
            }
        )
        raw_output = ai_message.content if isinstance(ai_message.content, str) else str(ai_message.content)
        logger.debug("Post summary LLM output received length=%d", len(raw_output))
        attempt_usage.append(extract_usage(ai_message))

        bullets = _parse_bullets(raw_output)
        sanitized_bullets = [cleaned for bullet in bullets if (cleaned := sanitize_text(bullet))]
        if sanitized_bullets != bullets:
            logger.info("Sanitized Post AI Summary prose field=summary")
        if sanitized_bullets:
            logger.info("Summarization complete: %d bullets returned", len(sanitized_bullets))
            return SummarizeResponse(
                postId=request.postId,
                summary=sanitized_bullets,
                model=model_name,
                usage=aggregate_usage(attempt_usage),
            )

        error = InvalidLlmOutputError("Post AI Summary has no non-empty bullets after sanitization")
        logger.warning(
            "Post summary LLM sanitized output invalid attempt=%d maxAttempts=%d reason=%s",
            attempt,
            MAX_LLM_ATTEMPTS,
            error,
        )
        if attempt == MAX_LLM_ATTEMPTS:
            raise error

    raise AssertionError("Post summary LLM attempt loop exited unexpectedly")

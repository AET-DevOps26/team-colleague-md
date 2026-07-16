"""Extract and aggregate token usage reported by LLM attempts."""

from app.schemas.summarize import TokenUsage


def extract_usage(ai_message) -> TokenUsage | None:
    """Extract token usage when the provider reports it for an LLM attempt."""
    if hasattr(ai_message, "usage_metadata") and ai_message.usage_metadata:
        usage = ai_message.usage_metadata
        return TokenUsage(
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
        )
    return None


def aggregate_usage(attempts: list[TokenUsage | None]) -> TokenUsage | None:
    """Sum attempt usage only when every LLM attempt reported metadata."""
    if not attempts or any(usage is None for usage in attempts):
        return None
    reported = [usage for usage in attempts if usage is not None]
    return TokenUsage(
        input_tokens=sum(usage.input_tokens for usage in reported),
        output_tokens=sum(usage.output_tokens for usage in reported),
        total_tokens=sum(usage.total_tokens for usage in reported),
    )

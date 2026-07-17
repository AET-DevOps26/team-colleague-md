"""Sanitize human-readable text produced or consumed by GenAI workflows."""

import unicodedata

import regex


_EMOJI_ARTIFACTS = {"\u200d", "\ufe0e", "\ufe0f", "\u20e3"}
_EMOJI_COMPONENT = r"(?:\p{Emoji_Presentation}|\p{Emoji}\ufe0f)(?:\p{Emoji_Modifier})?"
_EMOJI_PATTERN = regex.compile(
    rf"(?:\p{{Regional_Indicator}}{{2}}|[0-9#*]\ufe0f?\u20e3|"
    rf"{_EMOJI_COMPONENT}(?:\u200d{_EMOJI_COMPONENT})*|\p{{Emoji_Modifier}})"
)


class InvalidLlmOutputError(Exception):
    """Raised when sanitized LLM prose no longer satisfies its required contract."""


def sanitize_text(value: str) -> str:
    """Remove emoji and invisible controls while preserving ordinary technical prose."""
    without_emoji = _EMOJI_PATTERN.sub(" ", value)
    cleaned = "".join(_sanitize_character(char) for char in without_emoji)
    return " ".join(cleaned.split())


def _sanitize_character(char: str) -> str:
    codepoint = ord(char)
    category = unicodedata.category(char)
    if category == "Cc":
        return " "
    if (
        category == "Cf"
        or char in _EMOJI_ARTIFACTS
        or 0x1F3FB <= codepoint <= 0x1F3FF
        or 0xE0020 <= codepoint <= 0xE007F
    ):
        return ""
    return char

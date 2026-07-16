from app.services.output_sanitizer import sanitize_text


def test_sanitize_text_removes_complete_emoji_sequences_and_invisible_controls():
    value = "🚀 GPT-4o costs $10/1M — © 2026 👩🏽‍💻 2️⃣\u200b"

    assert sanitize_text(value) == "GPT-4o costs $10/1M — © 2026"


def test_sanitize_text_preserves_unicode_prose_and_technical_notation():
    value = "模型 3.5% schneller; C++ und GPT-4o bleiben erhalten."

    assert sanitize_text(value) == value


def test_sanitize_text_removes_format_controls_without_splitting_notation():
    value = "GPT\u200b-4o and C\u2060++ remain intact."

    assert sanitize_text(value) == "GPT-4o and C++ remain intact."

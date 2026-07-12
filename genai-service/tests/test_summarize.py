"""
Tests for the summarization endpoint.

Uses FastAPI TestClient with a mocked LangChain chain so that
tests run without a real API key or LLM service.
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

INTERNAL_TOKEN = "test-internal-token"
INTERNAL_HEADERS = {"X-Internal-Service-Token": INTERNAL_TOKEN}


@pytest.fixture
def client():
    """Create a FastAPI test client."""
    get_settings().internal_service_token = INTERNAL_TOKEN
    test_client = TestClient(app)
    test_client.headers.update(INTERNAL_HEADERS)
    return test_client


# ---------------------------------------------------------------------------
# Sample test data
# ---------------------------------------------------------------------------

VALID_CONTENT = (
    "OpenAI just released GPT-5 with significant improvements in reasoning, "
    "code generation, and multimodal understanding. The model shows 40% improvement "
    "on HumanEval benchmarks and introduces a new 'thinking' mode that makes its "
    "reasoning process transparent. Early benchmarks suggest it outperforms Claude "
    "and Gemini on most coding tasks, though it struggles with very long context "
    "windows. Pricing is set at $10 per million input tokens, making it a premium "
    "offering in the current LLM market."
)

MOCK_LLM_RESPONSE = (
    "• GPT-5 delivers 40% improvement on HumanEval with a new transparent thinking mode\n"
    "• Outperforms Claude and Gemini on coding but struggles with long context windows\n"
    "• Priced at $10/1M input tokens as a premium LLM offering"
)

SHORT_CONTENT = "Too short to summarize."  # Under 50 chars


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestSummarizeEndpoint:
    """Tests for POST /api/v1/genai/summarize."""

    def test_summarize_rejects_missing_internal_token(self, client):
        """GenAI work endpoints require the internal service token."""
        response = TestClient(app).post(
            "/api/v1/genai/summarize",
            json={"postId": "test-post-id", "content": VALID_CONTENT, "title": "GPT-5 Released"},
        )

        assert response.status_code == 403

    @patch("app.services.summarizer._build_chain")
    def test_summarize_success(self, mock_build_chain, client):
        """Valid request should return 200 with summary bullets."""
        # Mock the LCEL chain's ainvoke to return canned response
        from langchain_core.messages import AIMessage
        mock_chain = AsyncMock()
        mock_chain.ainvoke.return_value = AIMessage(
            content=MOCK_LLM_RESPONSE,
            usage_metadata={"input_tokens": 100, "output_tokens": 50, "total_tokens": 150}
        )
        mock_build_chain.return_value = (mock_chain, "gemini-2.0-flash")

        response = client.post(
            "/api/v1/genai/summarize",
            json={"postId": "test-post-id", "content": VALID_CONTENT, "title": "GPT-5 Released"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["postId"] == "test-post-id"
        assert len(data["summary"]) == 3
        assert data["model"] == "gemini-2.0-flash"
        assert "GPT-5" in data["summary"][0]
        assert data["usage"]["total_tokens"] == 150

    @patch("app.services.summarizer._build_chain")
    def test_summarize_without_title(self, mock_build_chain, client):
        """Request without title should also work."""
        from langchain_core.messages import AIMessage
        mock_chain = AsyncMock()
        mock_chain.ainvoke.return_value = AIMessage(
            content=MOCK_LLM_RESPONSE,
            usage_metadata={"input_tokens": 100, "output_tokens": 50, "total_tokens": 150}
        )
        mock_build_chain.return_value = (mock_chain, "gemini-2.0-flash")

        response = client.post(
            "/api/v1/genai/summarize",
            json={"postId": "test-post-id", "content": VALID_CONTENT},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["summary"]) == 3

    def test_summarize_content_too_short(self, client):
        """Content under 50 characters should return 422 validation error."""
        response = client.post(
            "/api/v1/genai/summarize",
            json={"postId": "test-post-id", "content": SHORT_CONTENT},
        )

        assert response.status_code == 422

    def test_summarize_missing_content(self, client):
        """Missing content field should return 422 validation error."""
        response = client.post(
            "/api/v1/genai/summarize",
            json={},
        )

        assert response.status_code == 422

    def test_summarize_empty_body(self, client):
        """Empty request body should return 422 validation error."""
        response = client.post(
            "/api/v1/genai/summarize",
            content="",
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 422

    @patch("app.services.summarizer._build_chain")
    def test_summarize_llm_failure(self, mock_build_chain, client):
        """LLM failure should return 502 with error details."""
        mock_chain = AsyncMock()
        mock_chain.ainvoke.side_effect = Exception("API rate limit exceeded")
        mock_build_chain.return_value = (mock_chain, "gemini-2.0-flash")

        response = client.post(
            "/api/v1/genai/summarize",
            json={"postId": "test-post-id", "content": VALID_CONTENT},
        )

        assert response.status_code == 502
        data = response.json()
        assert data["detail"]["error"] == "llm_error"
        assert "rate limit" in data["detail"]["details"]


class TestHealthEndpoint:
    """Tests for GET /health."""

    def test_health_check(self, client):
        """Health check should always return 200 OK."""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "GenAI Service"


class TestBulletParsing:
    """Tests for the _parse_bullets helper function."""

    def test_parse_standard_bullets(self):
        """Standard bullet format should parse correctly."""
        from app.services.summarizer import _parse_bullets

        raw = "• First point\n• Second point\n• Third point"
        result = _parse_bullets(raw)
        assert result == ["First point", "Second point", "Third point"]

    def test_parse_dash_bullets(self):
        """Dash-style bullets should parse correctly."""
        from app.services.summarizer import _parse_bullets

        raw = "- First point\n- Second point\n- Third point"
        result = _parse_bullets(raw)
        assert result == ["First point", "Second point", "Third point"]

    def test_parse_numbered_list(self):
        """Numbered list should parse correctly."""
        from app.services.summarizer import _parse_bullets

        raw = "1. First point\n2. Second point\n3. Third point"
        result = _parse_bullets(raw)
        assert result == ["First point", "Second point", "Third point"]

    def test_parse_keeps_short_output(self):
        """Output with fewer than 3 bullets should not gain empty bullets."""
        from app.services.summarizer import _parse_bullets

        raw = "• First point\n• Second point"
        result = _parse_bullets(raw)
        assert result == ["First point", "Second point"]

    def test_parse_truncates_long_output(self):
        """Output with more than 5 bullets should be truncated."""
        from app.services.summarizer import _parse_bullets

        raw = "• One\n• Two\n• Three\n• Four\n• Five\n• Six"
        result = _parse_bullets(raw)
        assert len(result) == 5
        assert result == ["One", "Two", "Three", "Four", "Five"]


class TestLlmFactory:
    """Tests for LLM provider wiring."""

    @patch("app.services.summarizer.ChatOpenAI")
    def test_get_llm_supports_logos_openai_compatible_provider(self, mock_chat_openai):
        from app.services.summarizer import _get_llm

        settings = SimpleNamespace(
            llm_provider="logos",
            llm_model="openai/gpt-oss-120b",
            llm_temperature=0.3,
            logos_api_key="test-logos-key",
            logos_base_url="https://logos.aet.cit.tum.de/v1",
        )

        result = _get_llm(settings)

        assert result == mock_chat_openai.return_value
        mock_chat_openai.assert_called_once_with(
            model="openai/gpt-oss-120b",
            api_key="test-logos-key",
            base_url="https://logos.aet.cit.tum.de/v1",
            temperature=0.3,
        )

"""
Tests for asynchronous daily digest generation.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.schemas.digest import (
    DigestEvent,
    DigestGenerateResponse,
    DigestJobWarning,
    DigestSource,
    DigestTopic,
)
from app.services.digest_generator import DigestJsonParseError
from app.services.digest_jobs import clear_jobs
from app.services.external_sources import ExternalSourceItem

INTERNAL_TOKEN = "test-internal-token"
INTERNAL_HEADERS = {"X-Internal-Service-Token": INTERNAL_TOKEN}


@pytest.fixture(autouse=True)
def reset_jobs():
    """Keep the in-memory job store isolated between tests."""
    get_settings().internal_service_token = INTERNAL_TOKEN
    clear_jobs()
    yield
    clear_jobs()


@pytest.fixture
def client():
    test_client = TestClient(app)
    test_client.headers.update(INTERNAL_HEADERS)
    return test_client


REQUEST_BODY = {
    "requestId": "recommendation-2026-06-04-user-123",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "digestDate": "2026-06-04",
    "periodStart": "2026-06-03T00:00:00Z",
    "periodEnd": "2026-06-04T00:00:00Z",
    "timezone": "Europe/Berlin",
    "topics": [
        {"id": "7f7d0f5a-9f75-4971-9624-89a01c3439d6", "name": "LLMs"},
        {"id": "1ff86b78-d1ef-4fb2-8eec-4f8931f22f1a", "name": "AI Agents"},
    ],
    "maxSourcesPerTopic": 5,
    "maxEvents": 8,
    "tone": "technical",
}


def _source(topic_id: str = "7f7d0f5a-9f75-4971-9624-89a01c3439d6") -> ExternalSourceItem:
    return ExternalSourceItem(
        provider="gnews",
        topicId=topic_id,
        topicName="LLMs",
        title="New LLM benchmark released",
        snippet="A new benchmark compares long-context behavior across major language models.",
        url="https://example.com/llm-benchmark",
        publishedAt=datetime(2026, 6, 3, 12, 0, tzinfo=timezone.utc),
        sourceName="Example News",
    )


def _digest_result() -> DigestGenerateResponse:
    topics = [
        DigestTopic(id="7f7d0f5a-9f75-4971-9624-89a01c3439d6", name="LLMs"),
        DigestTopic(id="1ff86b78-d1ef-4fb2-8eec-4f8931f22f1a", name="AI Agents"),
    ]
    return DigestGenerateResponse(
        digestDate=datetime(2026, 6, 4, tzinfo=timezone.utc).date(),
        periodStart=datetime(2026, 6, 3, tzinfo=timezone.utc),
        periodEnd=datetime(2026, 6, 4, tzinfo=timezone.utc),
        topStorySubtitle="LLM benchmarking led today's AI updates.",
        summary="New model evaluation work and agent tooling updates shaped the day.",
        topics=topics,
        events=[
            DigestEvent(
                headline="New LLM benchmark compares long-context behavior",
                summaryBullets=["The benchmark highlights differences in retrieval quality."],
                topicIds=[topics[0].id],
                sources=[
                    DigestSource(
                        url="https://example.com/llm-benchmark",
                        sourceName="Example News",
                        provider="gnews",
                        publishedAt=datetime(2026, 6, 3, 12, 0, tzinfo=timezone.utc),
                        title="New LLM benchmark",
                    )
                ],
            )
        ],
        eventCount=1,
        sourceCount=1,
        readTimeMinutes=1,
        generatedAt=datetime(2026, 6, 4, 0, 1, tzinfo=timezone.utc),
        model="test-model",
    )


class TestDigestJobs:
    """Tests for POST /digests/generate and GET /digests/jobs/{jobId}."""

    def test_digest_job_rejects_missing_internal_token(self):
        response = TestClient(app).post("/api/v1/genai/digests/generate", json=REQUEST_BODY)

        assert response.status_code == 403

    @patch("app.services.digest_runner.generate_digest", new_callable=AsyncMock)
    @patch("app.services.digest_runner.fetch_and_select_sources", new_callable=AsyncMock)
    def test_digest_job_success(self, mock_fetch, mock_generate, client):
        mock_fetch.return_value = ([_source()], [])
        mock_generate.return_value = _digest_result()

        response = client.post("/api/v1/genai/digests/generate", json=REQUEST_BODY)

        assert response.status_code == 202
        accepted = response.json()
        assert accepted["status"] == "QUEUED"
        assert accepted["requestId"] == REQUEST_BODY["requestId"]
        assert accepted["statusUrl"].endswith(accepted["jobId"])

        status_response = client.get(accepted["statusUrl"])
        assert status_response.status_code == 200
        data = status_response.json()
        assert data["status"] == "SUCCEEDED"
        assert "title" not in data["result"]
        assert data["result"]["sourceCount"] == 1
        assert data["error"] is None

    @patch("app.services.digest_runner.generate_digest", new_callable=AsyncMock)
    @patch("app.services.digest_runner.fetch_and_select_sources", new_callable=AsyncMock)
    def test_digest_job_succeeds_with_warnings(self, mock_fetch, mock_generate, client):
        warnings = [
            DigestJobWarning(
                provider="gnews",
                code="missing_credentials",
                message="GNEWS_API_KEY is not configured; skipped GNews source fetch.",
            ),
            DigestJobWarning(
                provider="all",
                topicId="1ff86b78-d1ef-4fb2-8eec-4f8931f22f1a",
                code="no_sources_for_topic",
                message="No external sources were found for topic 'AI Agents'.",
            ),
        ]
        mock_fetch.return_value = ([_source()], warnings)
        mock_generate.return_value = _digest_result()

        response = client.post("/api/v1/genai/digests/generate", json=REQUEST_BODY)
        data = client.get(response.json()["statusUrl"]).json()

        assert data["status"] == "SUCCEEDED"
        assert data["warnings"][0]["code"] == "missing_credentials"
        assert data["warnings"][1]["code"] == "no_sources_for_topic"
        assert data["result"]["eventCount"] == 1

    @patch("app.services.digest_runner.generate_digest", new_callable=AsyncMock)
    @patch("app.services.digest_runner.fetch_and_select_sources", new_callable=AsyncMock)
    def test_digest_job_fails_when_no_sources_found(self, mock_fetch, mock_generate, client):
        mock_fetch.return_value = (
            [],
            [
                DigestJobWarning(
                    provider="all",
                    topicId="7f7d0f5a-9f75-4971-9624-89a01c3439d6",
                    code="no_sources_for_topic",
                    message="No external sources were found for topic 'LLMs'.",
                )
            ],
        )

        response = client.post("/api/v1/genai/digests/generate", json=REQUEST_BODY)
        data = client.get(response.json()["statusUrl"]).json()

        assert data["status"] == "FAILED"
        assert data["error"]["code"] == "no_sources_found"
        assert data["warnings"][0]["code"] == "no_sources_for_topic"
        mock_generate.assert_not_awaited()

    @patch("app.services.digest_runner.generate_digest", new_callable=AsyncMock)
    @patch("app.services.digest_runner.fetch_and_select_sources", new_callable=AsyncMock)
    def test_digest_job_fails_when_llm_json_is_invalid(self, mock_fetch, mock_generate, client):
        mock_fetch.return_value = ([_source()], [])
        mock_generate.side_effect = DigestJsonParseError("bad json")

        response = client.post("/api/v1/genai/digests/generate", json=REQUEST_BODY)
        data = client.get(response.json()["statusUrl"]).json()

        assert data["status"] == "FAILED"
        assert data["error"]["code"] == "llm_parse_error"
        assert "bad json" in data["error"]["details"]

    def test_digest_job_not_found(self, client):
        response = client.get("/api/v1/genai/digests/jobs/00000000-0000-0000-0000-000000000000")

        assert response.status_code == 404
        assert response.json()["detail"]["error"] == "job_not_found"

    def test_digest_request_rejects_period_longer_than_one_day(self, client):
        body = {
            **REQUEST_BODY,
            "periodEnd": "2026-06-05T00:00:01Z",
        }

        response = client.post("/api/v1/genai/digests/generate", json=body)

        assert response.status_code == 422

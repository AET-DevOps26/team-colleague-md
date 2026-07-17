"""
Tests for the runtime LLM configuration override (ADR-0020).

Covers the internal GET/PUT endpoints, provider-availability reporting, the rejection of
unconfigured providers, and the fact that a set override actually reaches the LLM factory.
"""

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.services.llm_config import active_settings, reset_override

INTERNAL_TOKEN = "test-internal-token"
INTERNAL_HEADERS = {"X-Internal-Service-Token": INTERNAL_TOKEN}


@pytest.fixture
def settings():
    """Env baseline: nvidia + google have keys; Ollama has no endpoint."""
    s = get_settings()
    s.internal_service_token = INTERNAL_TOKEN
    s.llm_provider = "nvidia"
    s.llm_model = "moonshotai/kimi-k2.6"
    s.llm_temperature = 0.3
    s.nvidia_nim_api_key = "nvidia-key"
    s.google_api_key = "google-key"
    s.openrouter_api_key = ""
    s.logos_api_key = ""
    s.ollama_base_url = ""
    reset_override()
    yield s
    reset_override()


@pytest.fixture
def client(settings):
    test_client = TestClient(app)
    test_client.headers.update(INTERNAL_HEADERS)
    return test_client


class TestGetLlmConfig:
    def test_returns_env_default_and_provider_availability(self, client):
        response = client.get("/internal/v1/llm-config")

        assert response.status_code == 200
        body = response.json()
        assert body["provider"] == "nvidia"
        assert body["model"] == "moonshotai/kimi-k2.6"
        assert body["temperature"] == 0.3
        assert {p["name"]: p["configured"] for p in body["availableProviders"]} == {
            "openrouter": False,
            "nvidia": True,
            "google": True,
            "logos": False,
            "ollama": False,
        }

    def test_requires_internal_service_token(self, settings):
        response = TestClient(app).get("/internal/v1/llm-config")

        assert response.status_code == 403


class TestPutLlmConfig:
    def test_override_is_applied_and_returned(self, client):
        response = client.put(
            "/internal/v1/llm-config",
            json={"provider": "google", "model": "gemini-2.5-pro"},
        )

        assert response.status_code == 200
        assert response.json()["provider"] == "google"
        assert response.json()["model"] == "gemini-2.5-pro"

        # The next GET reads the live value, not the env default.
        assert client.get("/internal/v1/llm-config").json()["provider"] == "google"

    def test_override_reaches_the_llm_factory(self, client):
        client.put("/internal/v1/llm-config", json={"provider": "google", "model": "gemini-2.5-pro"})

        effective = active_settings()

        assert effective.llm_provider == "google"
        assert effective.llm_model == "gemini-2.5-pro"
        # Env fields other than provider/model are untouched.
        assert effective.nvidia_nim_api_key == "nvidia-key"

    def test_ollama_is_selectable_when_base_url_is_configured(self, client, settings):
        settings.ollama_base_url = "http://host.docker.internal:11434/v1"

        response = client.put(
            "/internal/v1/llm-config",
            json={"provider": "ollama", "model": "qwen3:4b-instruct"},
        )

        assert response.status_code == 200
        assert response.json()["provider"] == "ollama"
        assert response.json()["model"] == "qwen3:4b-instruct"
        assert {
            provider["name"]: provider["configured"]
            for provider in response.json()["availableProviders"]
        }["ollama"] is True

    def test_rejects_provider_without_api_key(self, client):
        response = client.put(
            "/internal/v1/llm-config",
            json={"provider": "openrouter", "model": "anthropic/claude-sonnet-4"},
        )

        assert response.status_code == 400
        assert response.json()["detail"]["error"] == "provider_not_configured"
        # The active config is unchanged.
        assert client.get("/internal/v1/llm-config").json()["provider"] == "nvidia"

    def test_rejects_unknown_provider(self, client):
        response = client.put(
            "/internal/v1/llm-config",
            json={"provider": "skynet", "model": "t-1000"},
        )

        assert response.status_code == 400
        assert response.json()["detail"]["error"] == "unsupported_provider"

    def test_rejects_blank_model(self, client):
        response = client.put("/internal/v1/llm-config", json={"provider": "google", "model": "  "})

        assert response.status_code == 400

    def test_requires_internal_service_token(self, settings):
        response = TestClient(app).put(
            "/internal/v1/llm-config",
            json={"provider": "google", "model": "gemini-2.5-pro"},
        )

        assert response.status_code == 403
        assert active_settings().llm_provider == "nvidia"

"""Source-level checks for the optional host-native Ollama deployment wiring."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_compose_exposes_ollama_url_and_overridable_local_deadlines():
    local_compose = (REPO_ROOT / "docker-compose.yml").read_text()
    production_compose = (REPO_ROOT / "docker-compose.prod.yml").read_text()

    assert "GENAI_READ_TIMEOUT_SECONDS=${GENAI_READ_TIMEOUT_SECONDS:-300}" in local_compose
    assert "DIGEST_MAX_WAIT_MS=${DIGEST_MAX_WAIT_MS:-300000}" in local_compose
    assert "OLLAMA_BASE_URL=${OLLAMA_BASE_URL:-}" in production_compose


def test_helm_exposes_optional_ollama_url_without_deploying_ollama():
    values = (REPO_ROOT / "infra/helm/verita/values.yaml").read_text()
    deployment = (
        REPO_ROOT / "infra/helm/verita/templates/deployment.yaml"
    ).read_text()

    assert 'ollamaBaseUrl: ""' in values
    assert "value: {{ $svc.llm.ollamaBaseUrl | quote }}" in deployment
    assert "image: ollama" not in values

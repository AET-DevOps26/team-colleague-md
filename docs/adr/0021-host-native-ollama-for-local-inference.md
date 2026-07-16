---
status: accepted
---

# Host-native Ollama for local inference

Verita must support both cloud and local LLM inference. We will add an opt-in `ollama` provider to
the containerized GenAI Service while running Ollama natively on the developer host, preserving
Apple Silicon acceleration and reusing the existing provider-selection boundary from ADR-0020.

## Decision

### Provider and topology

- The provider key is `ollama`, not the generic `local`; only Ollama's tested API contract is
  promised.
- `OLLAMA_BASE_URL` is environment-controlled and opt-in. A non-blank URL marks the provider
  configured; no availability read performs a live health probe.
- On macOS and Windows Docker Desktop, GenAI reaches native Ollama at
  `http://host.docker.internal:11434/v1`. Linux Docker Engine is outside the supported local
  topology because neither the team nor the evaluation environment uses it.
- Ollama is private to the host/container path. It receives no browser gateway route or public
  application endpoint.
- Compose and Helm expose the optional URL but do not deploy an Ollama container, model volume, or
  Kubernetes workload. The production Demo Deployment continues using its cloud provider.
- The Admin UI may select only `(provider, model)`. It cannot edit the URL, credentials, or other
  network destinations.

### Model invocation

- Ollama reuses LangChain's existing `ChatOpenAI` adapter with the configured base URL and a fixed
  non-secret placeholder API key. No `langchain-ollama` dependency is added.
- Model names remain free text and must be pulled by the operator before selection; GenAI does not
  implement provider-specific model discovery.
- The selected provider is authoritative for both Post AI Summaries and Daily Digests. Failures use
  the existing retries and failure states; there is no automatic cloud fallback.
- Digest generation explicitly uses `with_structured_output(..., method="json_schema")` for Ollama.
  Pydantic, required-prose, topic-reference, and source-reference validation remain mandatory because
  schema-constrained decoding guarantees shape rather than factual correctness.
- Ollama honors the shared `LLM_TEMPERATURE`; the local verification profile uses `0.0`.

### Constrained-hardware profile

The intended baseline is `qwen3:4b-instruct` with a 32K context on the 16 GB Apple Silicon
development machine. The host Ollama profile uses:

```text
OLLAMA_CONTEXT_LENGTH=32768
OLLAMA_NUM_PARALLEL=1
OLLAMA_MAX_LOADED_MODELS=1
OLLAMA_NO_CLOUD=1
```

Parameter count and context capacity are separate. The 4B quantized weights leave more unified
memory for the context cache than an 8B model; changing to 8B would not itself solve context limits.
GenAI does not silently truncate or apply Ollama-only source caps. If the 32K profile does not fit,
the design must be revisited with provider-neutral input budgeting or chunking.

Inference deadlines are deployment-configurable. Cloud defaults remain 60 seconds for synchronous
summary reads and 120 seconds for digest polling; the initial local profile uses
`GENAI_READ_TIMEOUT_SECONDS=300` and `DIGEST_MAX_WAIT_MS=300000`. Ollama owns local serialization;
GenAI does not add a provider-specific semaphore.

### Verification

- Normal CI uses mocked tests for availability, factory wiring, schema mode, errors, and deployment
  configuration.
- Real inference is an explicitly enabled suite against an already-running Ollama instance and an
  already-pulled model. Tests never install Ollama or download model weights.
- The summary case calls the real FastAPI endpoint.
- The digest case calls the real endpoint while stubbing only external-source collection with fixed
  `ExternalSourceItem` fixtures. Ollama invocation, job execution, structured decoding, sanitization,
  and result validation remain real; no test-only production API is added.
- Assertions are contract-level: execution finishes within the configured deadline, summaries have
  three to five non-empty sanitized bullets, digests pass all validators, every reference resolves
  to a fixture, and responses identify `qwen3:4b-instruct`. Exact prose is not compared.
- A manual run demonstrates the full application workflow with real source collection.
- macOS on the 16 GB Apple Silicon machine becomes verified only after this suite passes and timing
  is recorded. Windows Docker Desktop follows the supported topology but remains unverified until
  the same suite is run there.

On 2026-07-17, `qwen3:4b-instruct` passed both endpoint tests on the 16 GB Apple Silicon development
machine: the summary completed in about 10 seconds with five valid bullets, and the structured digest
completed in about 12 seconds with two valid, cited events. This verifies the macOS baseline; Windows
Docker Desktop remains supported but unverified.

## Considered Options

- **Containerize Ollama on macOS:** rejected because Docker Desktop does not provide the native Apple
  GPU path needed for practical inference on this machine.
- **Use a generic `local` provider or add `ChatOllama`:** rejected because it broadens the promised
  compatibility and implementation surface without a required capability.
- **Use an 8B model to gain context:** rejected because parameters and context are separate, while
  larger weights reduce memory available for the context cache.
- **Discover models, probe health, or fall back to cloud automatically:** rejected to preserve one
  provider-neutral config contract, explicit operator intent, predictable cost, and local-data
  boundaries.
- **Support native Linux Docker Engine:** rejected as unused project scope that adds host-network
  configuration and exposure concerns.

## Consequences

Local inference requires developers to install Ollama, pull the documented model, and opt in through
environment configuration. Requests may queue behind one active generation, and cold starts may be
noticeably slower than cloud inference. The design satisfies the architectural local-model path
without claiming that the current production infrastructure hosts a local model or that 4B output
quality matches the cloud models.

# Runtime LLM Provider Selection & Admin GenAI-Ops Surface

**Status:** proposed

Admins need to switch the LLM provider/model GenAI uses at runtime (and manually trigger summaries/digests) without a redeploy. We decided GenAI keeps a **mutable in-memory override** of `(provider, model)` layered over its env-configured default; a new **internal** GenAI endpoint reads/writes that override, and **content-service exposes the admin-JWT front door** (`/api/v1/admin/genai/**`) that forwards to GenAI over the existing `X-Internal-Service-Token` channel. The provider dropdown is driven by which providers actually have API keys configured, and selecting a keyless provider is rejected.

## Considered Options

- **Where the override lives.** In-memory in GenAI (chosen) vs. persisted to disk/DB in GenAI vs. persisted in content-service and passed per-request. GenAI is deliberately stateless (config from env, no datastore); adding persistence there is disproportionate for a demo platform, and threading provider/model through every summarize/digest request would change two callers' schemas. In-memory is the smallest change that meets the need.
- **How the browser reaches GenAI.** Proxy via content-service (chosen) vs. put GenAI on the gateway and teach it to validate admin JWTs. GenAI only does internal-token auth today; content-service is already the GenAI client and holds the internal token, so proxying avoids adding a second auth scheme to a Python service and needs no new gateway route.

## Consequences

- The active provider/model **resets to the env default on GenAI restart/redeploy** — acceptable, and the admin UI always reads the live value via GET so the reset is visible.
- content-service gains a thin admin-only GenAI-ops surface that is about GenAI configuration, not content — a deliberate placement chosen for pragmatism (it is the only GenAI client) over semantic purity.

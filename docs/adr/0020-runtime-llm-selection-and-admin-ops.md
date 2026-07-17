# Runtime LLM provider selection and the admin GenAI-ops surface

## Status

accepted (extends the JWT identity contract of ADR-0001; builds on ADR-0007)

## Context

The Admin panel is where three deferred capabilities finally get a home, and all three run into
the same wall: **the browser cannot talk to genai-service, and genai-service cannot authorize a
user.**

- **Choosing the LLM.** `(provider, model)` lives in genai-service's env (`llm_provider`,
  `llm_model`, read by the `_get_llm` factory). Changing the model today means editing the
  environment and restarting the service — impossible mid-incident, when a provider is down or a
  model is producing garbage and the whole point is to switch away from it *now*.
- **Re-summarizing a post.** #199 gave posts a `summaryStatus` state machine with retries; a post
  that exhausts them lands in `FAILED` and stays there forever. #199 deliberately left the manual
  re-trigger out and named an admin panel as its home, because triggering LLM work on demand costs
  budget and must not be open to every author.
- **Generating a user's digest.** `DailyDigestGenerationService.generateForUser` already exists but
  is reachable only over the internal-token channel (ADR-0007) — a service door, not a human one.

Two constraints shape the answer. GenAI's routers are internal-token-only and are not on the
browser gateway; giving them JWT awareness would mean teaching a stateless Python service the
identity contract of ADR-0001. And ADR-0001 explicitly declined to put a role in the token
("No `roles` claim is added yet (YAGNI)") — so today **no Spring service other than user-service
can tell an admin from anyone else**, because only user-service loads the role from its database.

## Decision

### 1. The JWT carries a `role` claim; consumers authorize on it

user-service adds a **`role` claim** to the access token alongside `userId`. content-service's
`JwtAuthenticationFilter` maps it to a single `ROLE_*` authority, so `hasRole("ADMIN")` works in
`SecurityConfig` exactly as it already does inside user-service. This **supersedes the "no roles
claim" YAGNI call in ADR-0001** — the admin panel is the use case that ADR predicted would
eventually justify it.

The role in a token is a **snapshot**, not a live read: a role change only reaches other services
when the user's next access token is minted (login, or the silent refresh, which rebuilds the
principal from the database). We accept the staleness window — it is bounded by the access-token
TTL, it can only be as stale as one refresh cycle, and the alternative (a per-request lookup to
user-service on every admin call) reintroduces exactly the fan-out ADR-0001 exists to prevent.

### 2. GenAI's LLM config is an in-memory override, layered over the env default

genai-service gains a mutable **in-memory `(provider, model)` override** (`app/services/llm_config.py`)
that the LLM factory consults before falling back to the environment. It is exposed over the
internal channel as `GET/PUT /internal/v1/llm-config`.

The override is deliberately **not persisted**: it lives in process memory and **resets to the env
default when genai-service restarts.** GenAI stays stateless — it has no database, and adding one to
hold a single tuple would be a large architectural cost for a small convenience. The env stays the
declared, reproducible baseline; the override is an operational lever on top of it. The UI always
reads the live value with `GET`, so it can never show a stale claim about what is running.

A provider whose required **connection setting is absent is unavailable**: a cloud provider requires
its API key, while a local provider requires its inference endpoint URL. `GET` reports per-provider
`configured` flags, the dropdown marks and disables unconfigured providers, and `PUT` **rejects**
them with 400. Configuration is intentionally not a live health check; reachability is verified by
an actual generation request. Selecting a provider that cannot be addressed at all is not a state
worth reaching, while probing every configured provider during an admin read would make that read
slow and dependent on external systems.

Provider connection settings remain **environment-controlled deployment configuration**. The
runtime override and Admin UI may change only the logical `(provider, model)` pair; they never
accept an API key, base URL, or other network destination. In particular, the local inference
endpoint is supplied through the GenAI Service environment. This keeps deployment topology
reproducible and prevents the admin configuration endpoint from becoming a server-side
request-forgery primitive.

The concrete local-inference provider, runtime topology, constrained hardware profile, and
verification strategy are specified separately in proposed ADR-0021.

### 3. content-service is the admin front door; GenAI stays internal-only

The browser holds an admin JWT that GenAI knows nothing about. Rather than teach GenAI the JWT
contract, **content-service authorizes the human and forwards over the internal-service-token
channel** (ADR-0007):

```
browser (ADMIN JWT) → content-service /api/v1/admin/** (hasRole ADMIN) → genai /internal/v1/** (X-Internal-Service-Token)
```

This adds no gateway route, no JWT work in Python, and keeps the two identity axes ADR-0007 drew:
**user tokens authorize user actions; the service secret authorizes service endpoints.** GenAI's
400 (unknown or unconfigured provider) is passed through as the admin's 400; anything else downstream is a
502.

The admin surface on content-service is:

| Endpoint | Behaviour |
|---|---|
| `GET/PUT /api/v1/admin/genai/llm-config` | Proxy to GenAI's internal config endpoints |
| `GET /api/v1/admin/posts/summaries/failed` | Paged posts in `summaryStatus = FAILED` |
| `POST /api/v1/admin/posts/{id}/summarize` | Sets `PENDING`, fires #199's event, **202** |
| `POST /api/v1/admin/digests/generate/users/{userId}?force=` | Runs `generateForUser` in the background, **202** |

### 4. Both triggers are asynchronous, and say so

Neither trigger returns a result, because neither can produce one inside a request:

- **Re-summarize** reuses #199's flow exactly — set `summaryStatus = PENDING`, publish the event,
  let the retrying listener write `COMPLETED`/`FAILED`. There is deliberately **no second,
  synchronous overwrite path**: one writer for a summary, not two. The client polls the endpoint
  the post detail page already uses (`GET /api/v1/posts/{id}/summary`).
- **Digest generation** blocks on a GenAI job plus external news fetches — far past a browser or
  gateway timeout. It runs on the async executor and answers **202**; the UI shows a "generation
  started" toast. A failure has no client left to report to, so it is logged, exactly as the
  scheduled daily job already does per recipient.

### 5. Admins cannot demote or ban themselves

`updateUserRole` and `updateUserBanStatus` **reject the acting admin's own account** (403), and the
panel disables those two controls on the admin's own row. A self-demotion or self-ban is the one
admin action that can strip the platform of its last administrator with no way back in through the
UI. The client-side disable is a courtesy; the server-side check is the guarantee.

While wiring this up we also found `/api/v1/users/*/ban` missing from user-service's `hasRole("ADMIN")`
matchers — it fell through to `anyRequest().authenticated()`, so **any logged-in user could ban
anyone**. Fixed here.

## Considered Options

- **Persist the LLM override** (a `genai_config` table or a content-service-owned setting): survives
  restarts, but gives a stateless service a database purely to store one tuple, and creates a second
  source of truth that can silently disagree with the env. Rejected; the reset-on-restart behaviour
  is documented and the UI reads the live value.
- **Expose GenAI's config endpoint through the gateway with a JWT**: would require GenAI to verify
  HS256 tokens and understand the ADR-0001 claims — duplicating the identity contract into Python
  for one screen. Rejected.
- **Per-request role lookup instead of a `role` claim**: always fresh, but puts a user-service call
  in front of every admin request and re-introduces the identity fan-out ADR-0001 removed.
  Rejected in favour of the bounded staleness window.
- **Synchronous re-summarize** (call GenAI inline and overwrite the summary): simpler feedback, but
  creates a second writer of summary state racing the retrying listener, and blocks a request thread
  on an LLM call. Rejected.
- **Moderation / flagged content** (the mockup's third tab): out of scope — there is no report or
  flag model to moderate yet.

## Consequences

- A role change does not take effect in content-service until the user's next token refresh. Banning
  is unaffected (user-service checks the database on login/refresh), but a **demoted admin keeps
  admin rights on content-service's admin routes until their access token expires.** Acceptable at
  this scale; a token-revocation list is the fix if it ever stops being.
- Tokens minted before this change carry no `role` claim and therefore no authority — they fail
  admin checks rather than passing them (fail-closed). Admins must re-login once.
- The LLM override is per-process. With more than one GenAI replica, a `PUT` only reaches the replica
  that served it. Single-replica today; making this fleet-wide means persisting it, i.e. revisiting
  the decision above.
- The admin panel is a convenience surface, never the security boundary: every action behind it is
  independently ADMIN-gated server-side.

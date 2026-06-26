# Testing Strategy

How Verita is tested — what tools each service uses, why they were chosen, how the
tests are structured, and how everything plugs into the local dev loop and CI.

This is the platform-wide overview. The frontend chapter is deliberately short here
because every frontend test case is already catalogued in
[Frontend_Testing.md](Frontend_Testing.md); this document covers the backend services,
the GenAI service, the cross-service API suite, and the CI/CD wiring that ties them
together.

---

## 1. Philosophy

Verita is a polyglot microservice platform (three Spring Boot services, one FastAPI
service, one React frontend), so there is no single test runner. Instead every service
owns its own fast test suite and the same shaped pyramid is repeated in each language:

```
                ╱╲          E2E  ── Playwright (UI)  ·  Bruno (cross-service API)
               ╱  ╲              manual / pre-PR, real or mocked stack
              ╱────╲
             ╱      ╲     Integration ── @SpringBootTest + Testcontainers,
            ╱        ╲                    MockMvc, FastAPI TestClient
           ╱──────────╲
          ╱            ╲   Unit ── JUnit 5 + Mockito · Vitest · pytest
         ╱──────────────╲          pure logic, all dependencies mocked
```

Two rules shape almost every decision below:

1. **Tests must run hermetically.** A unit or integration test must pass on a laptop
   and on a CI runner with no live external service, no real auth server, and no LLM
   credentials. Where a real dependency genuinely adds value (a Postgres database) we
   bring it up as a throwaway container; where it does not (an LLM, an upstream HTTP
   service) we mock it.
2. **Coverage is gated, not advisory.** Every service fails its build below **70 % line
   coverage** (referenced in code as ADR-0009). The number is identical across Java and
   Python so no service can quietly become the weak link.

---

## 2. The stack at a glance

| Service | Language / runtime | Unit | Integration | Coverage gate | CI workflow |
|---|---|---|---|---|---|
| `user-service` | Java 25 · Spring Boot 4 · Gradle | JUnit 5 + Mockito | MockMvc + H2 (slices) and Testcontainers Postgres (E2E) | JaCoCo ≥ 0.70 line | [`ci-user-service.yml`](../.github/workflows/ci-user-service.yml) |
| `content-service` | Java 25 · Spring Boot 4 · Gradle | JUnit 5 + Mockito | MockMvc + Testcontainers Postgres | JaCoCo ≥ 0.70 line | [`ci-content-service.yml`](../.github/workflows/ci-content-service.yml) |
| `recommendation-service` | Java 25 · Spring Boot 4 · Gradle | JUnit 5 + Mockito | MockMvc + Testcontainers Postgres | JaCoCo ≥ 0.70 line | [`ci-recommendation-service.yml`](../.github/workflows/ci-recommendation-service.yml) |
| `genai-service` | Python 3.12 · FastAPI | pytest + TestClient (mocked LangChain) | pytest + TestClient; opt-in live tests | pytest-cov `--cov-fail-under=70` | [`ci-genai-service.yml`](../.github/workflows/ci-genai-service.yml) |
| `frontend` | React 19 · TypeScript · Vite | Vitest + React Testing Library | Playwright + `page.route()` (API contract) | — (lint + type-check gate) | [`ci-frontend.yml`](../.github/workflows/ci-frontend.yml) |
| _cross-service_ | Bruno (`.bru`) | — | — | end-to-end API journeys | manual / headless CLI |

Approximate suite sizes today: ~85 `@Test` (user), ~93 (content), ~56 (recommendation),
~33 pytest cases (genai), ~123 Vitest/Playwright cases (frontend).

---

## 3. CI/CD integration

### 3.1 GitHub Actions — one workflow per service, path-filtered

Each service has its own workflow that runs **on pull requests targeting `dev`** and only
when files under that service change:

```yaml
on:
  pull_request:
    branches: [dev]
    paths:
      - "backend/content-service/**"
      - ".github/workflows/ci-content-service.yml"
```

Path filtering keeps PRs fast — touching the frontend does not rebuild three JVMs. The
workflows are intentionally minimal because the *build tool*, not the YAML, owns the test
logic:

- **Java services** — set up Temurin **JDK 25** with Gradle caching, then run a single
  `./gradlew build`. `build` compiles, runs every test, enforces the JaCoCo gate
  (`check` depends on `jacocoTestCoverageVerification`), and assembles the jar. There is
  no separate "test" step to forget.
- **GenAI service** — set up **Python 3.12** with pip caching, install
  `requirements.txt`, run an **import smoke test** (`python -c "from app.main import app"`)
  to catch missing deps / syntax errors before the suite, then `pytest -q`. The coverage
  gate lives in `pyproject.toml`, so a bare `pytest` already fails under 70 %.
- **Frontend** — set up **Node 24** with `npm ci` (exact lockfile install), then `lint`
  → `build` (which is `tsc -b` type-check + `vite build`) → `npm run test:unit`. The
  type-check is treated as a test: a type error fails the PR.

### 3.2 What CI does *not* run

| Suite | Why it is out of CI | How it is run instead |
|---|---|---|
| Playwright E2E (`npm test`) | Needs `npx playwright install` + a running dev server; slow | Locally before opening a PR |
| Bruno flows | Needs a booted, seeded stack | Locally / headless against a deployed env |
| GenAI live integration tests | Call real, paid, rate-limited provider + LLM APIs | Opt-in via env flags (see §5.3) |

This split is deliberate: CI guarantees that **every commit is correct in isolation**;
the heavier "does the whole system hang together" checks are run by a human before merge
and after deploys.

### 3.3 Pre-commit hooks

[`.pre-commit-config.yaml`](../.pre-commit-config.yaml) runs lightweight hygiene on every
commit:

- `trailing-whitespace` and `end-of-file-fixer` — formatting consistency.
- `openapi-lint` — `npx @redocly/cli lint` on any changed `openapi.yaml`. Because the
  Java services **generate their controllers and DTOs from that spec** (see §4.4), a
  broken spec is caught before it ever reaches a build.

---

## 4. Backend services (Spring Boot 4, Java 25)

All three Java services share the same toolchain and conventions, so they are described
together with per-service differences called out.

### 4.1 Tooling

- **JUnit 5 (Jupiter)** as the engine (`useJUnitPlatform()`).
- **`spring-boot-starter-test`** — pulls in JUnit 5, **Mockito**, **AssertJ**, and Spring's
  `MockMvc` / test context support.
- **`spring-security-test`** — `springSecurity()` MockMvc post-processor for exercising the
  real filter chain.
- **Testcontainers** (`testcontainers-bom`, `postgresql`, `junit-jupiter`) — real Postgres
  for integration tests.
- **JaCoCo** — coverage measurement and the failing gate.

### 4.2 The test layers

**Unit / service tests** (`*ServiceTest`, `*Tests` under `service/`, `security/`, `client/`).
Plain Mockito — the class under test is constructed with mocked collaborators, no Spring
context is started. These are the bulk of the suite and run in milliseconds. Examples:
`PostServiceTest`, `CommentServiceTest`, `FeedScoringTest`, `JwtUtilsTests`.

**Web-layer tests** (e.g. `PostControllerTest`, `AuthControllerTests`, `UsersControllerTests`).
These verify request mapping, status codes, and bean-validation → `400` translation through
`GlobalExceptionHandler`.

> **Boot 4 note.** Spring Boot 4.0.x **removed the MVC test slice** — there is no
> `@WebMvcTest` / `@AutoConfigureMockMvc` autoconfigure module anymore. The project
> standard is therefore to build `MockMvc` by hand from the `WebApplicationContext`:
>
> ```java
> mockMvc = MockMvcBuilders.webAppContextSetup(context).build();           // no security
> mockMvc = MockMvcBuilders.webAppContextSetup(context)
>                          .apply(springSecurity()).build();               // full chain
> ```
>
> Controller tests mock the service bean with `@MockitoBean` and bypass security; the full
> security chain is covered once, end-to-end, by the integration test.

**Integration tests** (`*IT`, `*IntegrationTests`, `*E2ETests`, `RepositoryIT`). Annotated
`@SpringBootTest` + `@Import(TestcontainersConfiguration.class)` +
`@Testcontainers(disabledWithoutDocker = true)`. They start the real application context
against a **throwaway Postgres container** and drive it through `MockMvc`. The upstream
HTTP clients (user-service, genai-service) are replaced with `@MockitoBean` so the test is
hermetic — it asserts *this* service's behaviour, not the network.

Authentication in these tests is real: the test **mints its own HS256 JWT** with the test
`app.jwt-secret` and a `userId` claim, so the production `JwtAuthenticationFilter` accepts
it without any auth server running (referenced as ADR-0006). See
`content-service/.../integration/ContentFlowIT.java` for the canonical example — it walks a
full post lifecycle (create → get → comment → like → bookmark) and also asserts the
security contract (`401` without a token, public read returns `200`).

### 4.3 Database strategy — Testcontainers vs H2

This is the one place the services differ, and it is a deliberate trade-off:

| | Slice / unit tests | Integration tests |
|---|---|---|
| `content-service` | Testcontainers Postgres 17 | Testcontainers Postgres 17 |
| `recommendation-service` | Testcontainers Postgres | Testcontainers Postgres |
| `user-service` | **H2 in-memory** (`application-test.properties`, Flyway off) | Testcontainers Postgres (`application-integration-test` profile) |

**Why Testcontainers is the default.** The container runs the **real Flyway migrations**,
producing a schema byte-for-byte identical to production — including Postgres-specific
features H2 cannot emulate (e.g. content-service's `tsvector` full-text column added in
`V3`). Because the real schema is present, Hibernate runs with `ddl-auto=none` and never
fabricates tables.

**Why user-service keeps H2 for slices.** Its slice tests don't need Postgres-specific DDL,
so H2 (`ddl-auto=create-drop`, Flyway disabled) gives a sub-second feedback loop; the
Postgres-fidelity checks are concentrated in the Testcontainers integration profile. Both
profiles supply a test-only `app.jwt-secret` and dummy S3/MinIO properties so beans resolve
without real object storage — the storage layer itself is mocked.

### 4.4 Generated code is excluded from coverage

The controllers/DTOs are generated from each service's `api/openapi.yaml` by the OpenAPI
Generator at compile time. JaCoCo strips `**/model/**`, `**/api/**`, and `**/invoker/**`
from both the report and the gate, so the **70 % line minimum reflects hand-written
business logic only** — generated boilerplate can neither inflate nor drag down the number.

### 4.5 Running them

```bash
cd backend/<service>
./gradlew test      # tests only
./gradlew build     # compile + test + JaCoCo gate + jar  (what CI runs)

# HTML coverage report after a run:
#   build/reports/jacoco/test/html/index.html
```

Integration tests need a Docker daemon. Without one they **skip cleanly**
(`disabledWithoutDocker = true`) rather than fail, so the unit suite still runs on a
Docker-less machine.

---

## 5. GenAI service (FastAPI, Python 3.12)

### 5.1 Tooling

- **pytest** with `asyncio_mode = "strict"` for the async service code.
- **FastAPI `TestClient`** to exercise routes in-process (no server, no port).
- **`unittest.mock`** (`AsyncMock` / `patch`) to replace the **LangChain chain** so the
  suite runs with **no API key and no LLM call**.
- **pytest-cov** for the coverage gate.

Configuration lives entirely in [`pyproject.toml`](../genai-service/pyproject.toml):

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "strict"
addopts = "--cov=app --cov-report=term-missing --cov-fail-under=70"

[tool.coverage.run]
source = ["app"]
omit = ["app/__init__.py", "app/*/__init__.py"]   # no-logic shims, mirrors the Java exclusions
```

A bare `pytest` therefore enforces the same 70 % gate as the Java services — CI needs no
extra flags.

### 5.2 What the mocked suite covers

`test_summarize.py`, `test_digest.py`, `test_digest_generator.py`, `test_external_sources.py`
drive the endpoints and core services with the LLM and external sources mocked. They assert
**contract and behaviour** — request validation, status codes, response shapes, source
selection logic — never the exact words an LLM would produce.

### 5.3 Opt-in live integration tests

`test_digest_live_integrations.py` calls **real external providers and a real LLM**. These
are skipped by default and only run when explicitly enabled:

```bash
RUN_DIGEST_PROVIDER_INTEGRATION=1 pytest tests/test_digest_live_integrations.py   # real source providers
RUN_DIGEST_LLM_INTEGRATION=1      pytest tests/test_digest_live_integrations.py   # real LLM endpoint
```

They `pytest.skip(...)` if the flag is unset or credentials are missing, so they never break
CI or a local run. Their purpose is manual verification that the live wiring still works,
not regression gating.

### 5.4 Running them

```bash
cd genai-service
pip install -r requirements.txt
pytest -q            # what CI runs (mocked, with coverage gate)
```

---

## 6. Frontend (React 19, TypeScript)

Three layers; full per-test-case tables are in [Frontend_Testing.md](Frontend_Testing.md).

| Layer | Tool | Command | Runs in CI? |
|---|---|---|---|
| Unit / component | Vitest + React Testing Library (`jsdom`) | `npm run test:unit` | ✅ yes |
| E2E | Playwright (Chromium) | `npm test` | ❌ manual, pre-PR |
| API contract | Playwright + `page.route()` | `npm test` | ❌ manual, pre-PR |

- **Unit / component** ([`vitest.config.ts`](../frontend/vitest.config.ts)) — pure
  functions (`timeAgo`, `getInitials`, `topicSort`), the token store, and component logic
  (`Toast`, `ManageTopics`). Fast (~5 s), no browser. This is the layer CI runs.
- **E2E** ([`playwright.config.ts`](../frontend/playwright.config.ts)) — critical user
  journeys (auth, home, digest, profile, settings) in real Chromium. Playwright boots the
  Vite dev server itself (`webServer`), runs single-worker with one retry, and captures
  screenshots only on failure. **No real backend is needed** — the app's in-memory mock
  service plus `page.route()` mocking of `…/auth/refresh` simulate a logged-in session.
- **API contract** (`tests/api/`) — feeds the UI **OpenAPI-spec-shaped** responses via
  `page.route()` to verify the frontend renders the real backend's data contract. These
  are designed to graduate into true integration tests once the live backend is wired up
  (just remove the mock).

Lint (`eslint`) and the `tsc -b` type-check in `build` are also enforced by CI and act as a
static-analysis gate.

---

## 7. Cross-service API testing (Bruno)

A single repo-level [Bruno](https://www.usebruno.com/) collection (referenced as ADR-0005)
provides the one thing per-service tests and Swagger UI cannot: **a login token from
user-service flowing on into content / recommendation / genai calls**. See
[`bruno/README.md`](../bruno/README.md) for full detail.

- **`flows/`** — the core deliverable: token-carrying, end-to-end journeys, one folder per
  user story (auth, authoring, engagement, discovery, personalization, profile, moderation,
  genai, internal-service). Each flow logs in at step 1, provisions its own data, and cleans
  up after itself, so it is independently runnable.
- **single-endpoint palette** (`user/ content/ recommendation/ genai/`) — one request per
  endpoint for ad-hoc poking.
- **Four environments** (`local`, `azure-vm`, `k8s-dev`, `k8s-prod`); each `baseUrl`
  absorbs the gateway path prefix so request files stay environment-agnostic. Structure is
  committed, secrets (passwords, real internal-service tokens) are not.

Headless run (the green target) against a booted, seeded local stack:

```bash
npx @usebruno/cli run flows --env local
```

**The LLM / async boundary.** Like the other suites, Bruno asserts only what a booted stack
guarantees **without external LLM creds**: status codes, schema-field presence, and the
cross-service identity fact (`200`, not `401`). Generated text is never asserted —
`summarize` checks for a `200`, `digests/generate` checks for `202` + a `jobId`, and the
async post-summary populated by `SummaryEventListener` is never asserted at all.

---

## 8. Coverage gates summary

| Service | Tool | Threshold | Exclusions |
|---|---|---|---|
| user / content / recommendation | JaCoCo | 70 % LINE (`check` fails below) | generated `model` / `api` / `invoker` |
| genai | pytest-cov | 70 % (`--cov-fail-under=70`) | package `__init__.py` shims |
| frontend | — | no % gate; lint + type-check must pass | — |

The matching 70 % line across Java and Python (ADR-0009) is intentional: it sets one bar
for the whole platform.

---

## 9. The developer workflow

What runs, and when, from keystroke to merge:

1. **On save / pre-commit** — `pre-commit` fixes whitespace/EOF and lints any changed
   OpenAPI spec. Run the relevant fast suite as you go:
   - backend: `./gradlew test`
   - genai: `pytest -q`
   - frontend: `npm run test:unit:watch`
2. **Before opening a PR** — run the heavier suites CI does not:
   - frontend E2E: `npx playwright install` (first time) then `npm test`
   - cross-service: boot + seed the stack, then `npx @usebruno/cli run flows --env local`
     (see [README](../README.md) for `docker compose up --build` and `npm run seed:local`).
3. **On the PR (CI)** — the path-matched workflow(s) run the per-service build: compile,
   unit + integration tests, the coverage gate, lint and type-check. A red gate blocks the
   merge to `dev`.
4. **After deploy** — point the Bruno collection at `azure-vm` / `k8s-dev` / `k8s-prod` to
   smoke-test the deployed environment with real cross-service auth.

---

## 10. What is intentionally not tested (and why)

- **LLM output content** — non-deterministic and credential-gated. Every layer asserts the
  *contract* around the LLM (status, shape, async acceptance), never the generated text.
- **Live external providers in CI** — paid, rate-limited, flaky. Gated behind opt-in env
  flags in genai-service.
- **Real object storage (MinIO/S3) in unit tests** — the storage layer is mocked; bucket
  wiring is verified by running the real stack and by Bruno's file-upload steps.
- **Endpoints that do not exist yet** — e.g. the user-verification submit/approve flow and
  admin removal of others' posts have no implementation, so there is nothing to test
  (tracked as backlog in [`bruno/README.md`](../bruno/README.md)).

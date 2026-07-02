# Test architecture and coverage standard

## Status

accepted

## Context & Decision

user-service and content-service had each grown a healthy, similar test suite (78 and 85 tests) with a JaCoCo 0.70 line-coverage gate; recommendation-service had only 20 tests, **no coverage gate**, and zero unit tests for its service layer — including `FeedService`, the most complex class and the one carrying the new #163/#164 logic. The two healthy services already imply a test architecture; this ADR makes it the explicit standard so every service converges and rec is brought up to it.

### The layered test architecture (the pyramid)

1. **Service-layer unit tests** — Mockito (`@Mock`/`@InjectMocks`), **no Spring context**, fast. Cover business logic and branch behaviour (ownership/authorization rules, fallbacks, fail-open/closed, scoring/affinity). This is the widest layer and the one rec lacks.
2. **Repository integration tests** — `@DataJpaTest`-style against a **Testcontainers PostgreSQL**, for hand-written/derived queries whose behaviour the H2 default can't validate (FTS, custom JPQL, ordering).
3. **One full-context flow IT per service** — `@SpringBootTest` through the **real security chain**, controllers, services, and a Testcontainers DB; upstream services are mocked (`@MockitoBean`). Authentication uses a token minted with the test `app.jwt-secret` carrying the `userId` claim (ADR-0006).
4. **Controller-layer behaviour** — covered by the flow IT, plus thin `@WebMvcTest` slices where request mapping / validation / error-to-HTTP mapping needs isolated coverage (e.g. content's split controllers).

### Coverage gate

- **JaCoCo line coverage ≥ 0.70**, enforced via `jacocoTestCoverageVerification` with `check.dependsOn` it, in **every** Java service (added to recommendation-service to match user/content).
- **Generated OpenAPI code is excluded** (`**/model/**`, `**/api/**`, `**/invoker/**`) so the number reflects hand-written logic only.
- 0.70 is the floor, not a target — chosen because it is realistic, already met by two services, and high enough to catch untested classes without incentivising assertion-free tests.

### genai-service

Python/pytest with 33 tests across summarize/digest/external sourcing. In scope for an audit + filling obvious gaps only; no Java-style gate is imposed this round.

## Considered Options

- **Higher gate (0.80/0.85)**: rejected for now — would force lower-value tests on glue code; 0.70 uniformly is the pragmatic bar for the project's scale. Teams may raise it later.
- **Integration-only (skip the Mockito unit layer)**: rejected — slow, and poor at exercising branch-level business logic; the unit layer is where ownership/affinity/fail-open rules are cheaply and precisely tested.
- **No gate, rely on review**: rejected — rec's gap is exactly what an automatic gate prevents from regressing.

## Consequences

- recommendation-service gains the gate and a full Mockito unit layer (`FeedService` incl. #163/#164, the subscription/notification/interaction services, ranking helpers, security utils/filter).
- The gate runs in each service's CI (`./gradlew build`/`test` → `check`), so coverage regressions fail the build.
- New code is expected to ship with its tests; the gate makes that non-optional rather than a review-time ask.

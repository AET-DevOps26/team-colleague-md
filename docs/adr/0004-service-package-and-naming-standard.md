# Service package layout and class-naming standard

## Status

accepted

## Context & Decision

The three Spring Boot services (user, content, recommendation) drifted into three different package layouts and three different names for the same concerns, which makes each service a fresh puzzle and blocks reuse during the upcoming content/user refactors. recommendation-service is the cleanest and is the seed for a standard — but the standard is its own spec: where recommendation-service is right it is promoted to the rule, where it deviates from an existing convention it is corrected to the rule.

We standardised the following. All three services converge onto it; recommendation-service is the reference implementation.

### 1. Naming is by **role**, not one name for everything

`SecurityUtils` (recommendation, consumer-side) and `JwtUtils` (user, issuer-side) do **different jobs** and should not be merged into one name. The standard fixes a name per role:

| Role | Who has it | Standard name |
|---|---|---|
| **Issuer** token operations (sign / validate / read claims via JJWT) | user-service only | `JwtUtils` |
| **Consumer** current-identity accessor (read the `userId` claim off the already-verified `JwtAuthenticationToken`) | recommendation, content (post-migration), any future consumer | `SecurityUtils`, with the canonical method `getCurrentUserId()` |
| Security filter-chain configuration | all services | `SecurityConfig` (in `config/`) |
| Consumer auth entry point / error handler | consumers | `SecurityErrorHandler` |

`SecurityUtils` stays an injected `@Component` (it reads the `SecurityContext`), keeping the JHipster-style `SecurityUtils.getCurrentUserId()` convention the team already recognises. content-service gains a `SecurityUtils` only when it migrates off its hand-rolled `JwtFilter` (issue #161); user-service keeps `JwtUtils` and renames `WebSecurityConfig` → `SecurityConfig`.

### 2. Package taxonomy (recommendation-service's layout is the rule)

`client/` (+ `client/dto/`) · `config/` · `controller/` · `entity/` · `exception/` · `filter/` · `mapper/` · `repository/` · `security/` · `service/`.

- **Entities live in `entity/`.** They are anaemic JPA persistence objects, so `entity` is accurate; `domain/` is rejected as misleading for objects with no rich behaviour. content-service's `domain/` → `entity/`; user-service's `UserEntity` moves out of `repository/` into `entity/`.
- **`GlobalExceptionHandler` lives in `exception/`** (not `controller/`). This corrects CLAUDE.md, which is being updated to match: a dedicated exception/handler package is the more common industry placement and keeps the `@RestControllerAdvice` next to the exception types it maps. user-service's handler moves from `controller/` → `exception/`.
- **Outbound clients live in `client/`** as one thin `RestClient`-per-upstream `@Component` with minimal hand-rolled DTOs in `client/dto/` (per ADR-0002). content-service's `support/Clients.java` is split to match; content's `support/` god-package is dissolved into `config/`, `security/`, `client/`, `exception/`.

### 3. Service layer: **on-demand package-by-feature**

`service/` holds application services (orchestration / transactional, suffix `*Service`). Small single-purpose classes are kept, **not merged** — collapsing `FeedScoring` / `FeedCursor` / `TrendingRanker` / `ScoredPost` into `FeedService` would produce one large class mixing pure functions, caching, and orchestration and would hurt unit-testability of the ADR-0003 ranking logic. A class count is not complexity; one do-everything class is.

The rule: **a lone `*Service` stays flat in `service/`; once a feature grows satellite classes (pure strategy/helpers or value objects) it is promoted to a feature sub-package.** recommendation-service gets a `service/feed/` sub-package (`FeedService`, `FeedScoring`, `FeedCursor`, `TrendingRanker`, `ScoredPost`, `TopicNameResolver`); `SubscriptionService`, `NotificationService`, `InteractionService` stay flat. content/user apply the same test (e.g. content's post code becomes `service/post/` only if it accumulates satellite classes).

### 4. Correlation-id / MDC tracing is **recommended, not required**

recommendation-service's `CorrelationIdFilter` (`filter/`) + `MdcTaskDecorator` (`config/`) are the reference implementation for end-to-end log correlation across the async boundary. They are documented as the standard pattern but **not mandated** for user/content this round — they are a cross-cutting ops enhancement, touch no API contract, and would bloat the standardisation PRs. When/whether to backfill is tracked as a separate observability issue.

## Considered Options

- **Merge `SecurityUtils` and `JwtUtils` into one name** (the original request): rejected — they are issuer vs consumer concerns; a shared name would hide a real architectural difference.
- **`domain/` for entities** (content's choice): rejected — anaemic persistence objects, `entity` is honest.
- **`GlobalExceptionHandler` in `controller/`** (CLAUDE.md's prior rule, user-service's placement): rejected in favour of `exception/`; CLAUDE.md updated rather than the other two services bending to it.
- **Full package-by-feature** (every service gets a sub-package, `service/` disappears): rejected — over-structures lone services and fragments navigation in a small (~600-line) service layer.
- **Mandating correlation-id across all three services**: rejected as inconsistent with dropping rate-limiting from the standard and with the small-project simplicity bar.

## Consequences

- content-service's auth migration (#161) is the vehicle that brings it onto the consumer naming + package rules; until then it keeps the legacy `support/SecuritySupport` `JwtFilter` and remains the one service off-standard.
- The `ContenServiceApplication` class-name typo is corrected opportunistically when content's packages are reorganised.
- Cross-service correlation only becomes real once outbound clients forward `X-Correlation-ID`; `ContentClient` does **not** yet do this, so today the id is per-service. Forwarding is part of the deferred observability work, not this standard.

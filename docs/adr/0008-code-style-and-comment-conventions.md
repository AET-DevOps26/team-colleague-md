# Code style and comment conventions

## Status

accepted (extends ADR-0004)

## Context & Decision

The three Spring Boot services drifted in incidental style — logging, constructor injection, and especially comment density — which hurts readability and makes the services feel unrelated. ADR-0004 standardised package/naming; this fixes the in-file conventions. recommendation-service's "moderate density, explain *why*" style is the reference; content-service's terse style and user-service's per-method-verbose Javadoc are the two extremes to converge away from.

1. **Logging: Lombok `@Slf4j`.** content-service's hand-rolled `LoggerFactory.getLogger(...)` fields are replaced.

2. **Constructor injection: Lombok `@RequiredArgsConstructor` + `final` fields.** Hand-written injection constructors are removed as boilerplate.

3. **Javadoc explains *why* / the contract, never restates *what* the code does.**
   - **Class-level Javadoc** is required on services, controllers, clients, and filters — one sentence of responsibility.
   - **Method-level Javadoc** only when a public method has a **non-obvious contract, side effect, or cross-service behaviour** (e.g. "fail-open", "async best-effort", "forwards the caller's token", "eventually consistent"). Plain getters / self-evident methods get none.
   - **Methods implementing an OpenAPI-generated interface (`@Override`) get no Javadoc by default** — the contract (description, params, responses, error codes) already lives in `openapi.yaml` and the generated `com.verita.api` interface. Add a comment only when the implementation does something **beyond** the contract.
   - **Inline comments** only at non-obvious decisions, and reference the governing ADR where one exists (e.g. `// identity travels in the userId claim (ADR-0001)`), following recommendation-service's habit.
   - **Restating comments are deleted** (`// set the name` over `setName(...)`).

4. **One controller per resource.** A controller owns a single resource family. content-service's monolithic `ContentController` (posts + comments + topics + votes + bookmarks) is split into `PostController`, `CommentController`, `TopicController`, etc. — matching ADR-0004's structure rule and the other services' shape.

## Considered Options

- **Per-method Javadoc everywhere** (user-service's current style): rejected — verbose, and on generated-interface overrides it duplicates the OpenAPI contract.
- **Class-level Javadoc only** (content-service's near-current style): rejected — loses the "why" on the genuinely non-obvious methods that most need it.
- **Leave the monolithic `ContentController`**: rejected — it is the single least navigable file in the backend and violates ADR-0004's one-responsibility structure.

## Consequences

- content-service absorbs the most churn (logging, constructor cleanup, controller split) — folded into its M0 ADR-0004 convergence so it is touched once.
- "Explain why, not what" plus the OpenAPI-override carve-out keeps comment volume low while preserving the high-value context (ADR references, fail-open/async semantics).
- These conventions are added to CLAUDE.md so they are enforced on new code, not just the refactor.

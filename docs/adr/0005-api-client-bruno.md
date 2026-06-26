# Bruno API client for cross-service token flows

## Status

accepted

## Context & Decision

Every Java service already ships springdoc/Swagger UI (`/swagger-ui.html`), which covers single-endpoint inspection and try-it-out and stays auto-synced with each `openapi.yaml`. The gap Swagger UI cannot close is the **cross-service JWT identity flow** (ADR-0001): logging in at user-service, carrying the resulting `userId`-claim token, and replaying it against recommendation/content endpoints. Swagger UI is per-service and cannot move a token across services, so the exact path most exercised during these refactors is the one it tests worst.

We adopt **Bruno** for that purpose. It is **not** introduced to "view the OpenAPI definition" (Swagger UI already suffices); its job is repeatable, version-controlled, token-carrying end-to-end flows.

1. **A single repo-level collection** at `bruno/` (repo root), organised by folders: `user/`, `content/`, `recommendation/`, `genai/` for single-endpoint requests, plus a `flows/` folder for end-to-end sequences (e.g. `login-then-personal-feed.bru`). A single shared environment holds each service's `baseUrl` and a `token` variable so the token flows across services in one place. Per-service collections were rejected — a token cannot be shared across separate collections, which defeats the entire purpose.

2. **Credentials: commit structure, never secrets.** The committed environment carries `baseUrl`s (local defaults `localhost:8081/8082/8083/8000`) and an empty `token` var. Real account passwords are **not** committed — use Bruno secret vars or a git-ignored local override. `token` is never committed; a `login` request's post-response script writes it into the env var at runtime. Test accounts reference the existing seed users (`scripts/seed/data/users.ts`) by name rather than hard-coding passwords into the collection.

3. **Hand-maintained, imported once.** Bruno does not auto-sync with `openapi.yaml`; the collection is seeded once and maintained by hand. Cross-service flows cannot be generated from any single spec anyway.

## Considered Options

- **Swagger UI only** (status quo): sufficient for single-endpoint viewing/testing, but cannot carry a token across services — the actual requirement.
- **Per-service Bruno collections** under each `backend/<svc>/`: co-located with code but cannot share a token across collections; rejected.
- **Postman**: heavier, cloud-account-oriented, and its collections are less git-friendly than Bruno's plain-text `.bru` files.
- **Committing local test credentials** for convenience: rejected — invites a real credential entering git history later.

## Consequences

- The collection is a reviewable artefact: `.bru` files diff in PRs, so request/flow changes are visible alongside code.
- Bruno can drift from the specs since it is hand-maintained; Swagger UI remains the always-synced contract view, Bruno is the flow-replay tool. The two are complementary, not redundant.

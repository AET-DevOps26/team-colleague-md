# Internal service-to-service authentication

## Status

accepted (resolves the deferral in ADR-0002)

## Context & Decision

ADR-0002 standardised cross-service calls but explicitly **deferred service identity**: content-service's `POST /api/v1/topics/follower-counts` (the topic Follower Count delta sync, called by recommendation-service on subscribe/unsubscribe) is currently callable by **any authenticated user** — a low-severity count-skew vector (issue #162). Two facts shape the fix:

- The gateway is a **path-prefix proxy** (`/content/` → content-service) that forwards *all* sub-paths, so `follower-counts` is reachable externally today; the gateway does not isolate sub-paths.
- recommendation-service calls content over the **internal** address (`http://content-service:8082/...`), bypassing the gateway entirely.

We introduce a coarse **shared internal-service secret**:

1. **A single shared `INTERNAL_SERVICE_TOKEN`** (a new secret, distinct from `JWT_SECRET`, distributed via env and aligned across services the same way `JWT_SECRET` is). Callers of an internal endpoint send it as an `X-Internal-Service-Token` header; the callee validates it.

2. **Internal endpoints are authenticated by the service secret, not a user token.** `/api/v1/topics/follower-counts` is set `permitAll` at the user-auth layer (it is a *service* operation, not a user action) and gated by a small internal-secret check (a path-scoped filter/interceptor, or an explicit precondition) that returns **403** on a missing/wrong header. This cleanly separates the two identity axes — user tokens authorise user actions, the service secret authorises service endpoints — and recommendation-service no longer needs to forward a user token on this call.

3. **Service identity stays coarse on purpose.** One shared secret proves "an internal service called me", not *which* service. Per-caller identity (minted service JWT with an audience claim) is rejected as overkill at this scale, consistent with ADR-0002 having already declined to mint service JWTs.

## Considered Options

- **Gateway path-block only** (return 403 for the external `follower-counts` path at each gateway): no app code, but must be replicated across three gateway configs (nginx, Helm ingress, Ansible), is easy to forget, and gives **no** protection against in-cluster callers. Kept as optional **defense-in-depth for M4 (DevOps)**, layered on top of the secret — not the primary lock.
- **Minted per-service JWT (audience claim)**: strongest (per-service identity) but heavier; deferred as YAGNI at current scale.
- **Status quo (any authenticated user)**: rejected — the count-skew vector #162 is filed precisely to close this.

## Consequences

- The lock is portable: it works for the internal direct-call path recommendation-service actually uses, independent of network topology, and is unit-testable.
- A leaked `INTERNAL_SERVICE_TOKEN` grants access to all internal endpoints (coarse blast radius); rotation is an env-var change. Acceptable at this scale.
- The same pattern is the template for any future internal-only endpoint across services.

## Addendum — `/internal/v1/` path prefix (cross-service user deletion)

The cross-service user-deletion cleanup (PR #167) added a *second* internal endpoint per service (`DELETE /internal/v1/users/{userId}/data` on content- and recommendation-service, called by user-service when an account is deleted). Integrating it surfaced that the original endpoints (`follower-counts`, `digest`) live under `/api/v1/...` and are gated by a **hardcoded path list** in `InternalAuthFilter` — adding each new internal endpoint meant editing the filter list *and* the `permitAll` list, and it blurred public vs service endpoints under one prefix.

Decision: **all service-to-service endpoints standardise on the `/internal/v1/...` prefix.** `InternalAuthFilter` gates by prefix (`requestURI.startsWith("/internal/")`) instead of an enumerated path list, so new internal endpoints need **zero** filter changes; `SecurityConfig` `permitAll`s the prefix at the user-auth layer. The pre-existing `follower-counts` and `digest` endpoints migrate under the prefix. The `X-Internal-Service-Token` mechanism is unchanged.

This also keeps the deletion flow compliant with ADR-0006: user-service's deletion clients authenticate with `X-Internal-Service-Token`, and do **not** thread the caller's `Authorization` header through the service layer (the form PR #167 originally used against pre-refactor `dev`).

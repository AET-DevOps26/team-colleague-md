# Optional authentication and the unified JWT filter

## Status

accepted (refines ADR-0001)

## Context & Decision

Verita is a guest-browse-heavy community platform: public endpoints must work with **no token** (guests), but several of them are also **personalised when a token is present** (e.g. content's `getAllPosts`/`searchPosts`/`getPostCards` populate `isLikedByMe`/`isBookmarked` via `optionalUserId(authorization)`). The two consumer services implemented authentication in two incompatible ways:

- **recommendation-service** used Spring `oauth2ResourceServer` (NimbusJwtDecoder) — **fail-closed**: any token presented must be valid or the request is 401'd, even on a public endpoint. It reads identity from the `userId` claim (the ADR-0001 model).
- **content-service** used a hand-rolled `JwtFilter` — **fail-open**: an invalid token is ignored and the request proceeds. But it sets only the *username*, then resolves the caller's UUID by calling user-service `/users/me` on every authenticated request, and threads the raw `Authorization` string through the entire service layer.

Neither is right on its own: `oauth2ResourceServer` cannot express **optional authentication** (the access matrix below), while content's filter carries the obsolete `/users/me` identity model ADR-0001 retired.

### Access matrix (the target behaviour)

| Endpoint | No token (guest) | Valid token | Invalid / expired token |
|---|---|---|---|
| **Public** (GET posts, topics, trending, …) | 200, anonymous | 200, **personalised** | 200, treated as anonymous (fail-open) |
| **Protected** (POST posts, track, subscribe, …) | 401 | 200 | 401 |

Decisions:

1. **Optional authentication is the platform model.** Public endpoints fail **open** to anonymous; a *valid* token still personalises them; protected endpoints fail **closed**. The "invalid token on a public endpoint" case is rare by design — it is avoided by short-lived access tokens + silent refresh (issue #103) and a frontend 401 interceptor that clears the token and falls back to guest browsing. Failing open on already-public data is not a security risk; the invariant that matters is that protected endpoints always fail closed.

2. **One unified JWT mechanism: a custom `JwtAuthenticationFilter` per service.** Each service carries its own copy (no shared library — consistent with ADR-0002) of a `OncePerRequestFilter` that:
   - verifies the bearer token with a **`NimbusJwtDecoder` + shared HS256 secret** (keeps ADR-0001's verification + `userId`-claim model, including the validator that rejects tokens missing the `userId` claim);
   - on a **valid** token, sets a `JwtAuthenticationToken` (carrying the `userId`) into the `SecurityContext`;
   - on an **invalid** token, clears the context and continues — **does not** 401 here;
   - on **no** token, continues.
   Authorization rules (`permitAll` for public paths, `anyRequest().authenticated()`) do the enforcing: a protected endpoint with no/invalid auth 401s via `SecurityErrorHandler` (JSON body). This single mechanism satisfies content's optional-auth, recommendation's protected fail-closed, and user's purely-protected cases.

3. **Identity comes from the `SecurityContext`, never from a threaded header.** `SecurityUtils` exposes `getCurrentUserId()` (required — used on protected endpoints, throws when absent) and `getCurrentUserIdOptional()` (used on personalised public endpoints). The `Authorization`-string-threading and the `/users/me` identity fan-out in content-service are removed; user-service `/users/me` profile *data* lookups for **other** users (author cards) stay (that is profile data, not identity).

This **refines ADR-0001**: its NimbusJwtDecoder + shared-secret + `userId`-claim verification is kept, but the "resource-server style" is replaced by a custom fail-open filter, because ADR-0001 did not consider optional authentication.

## Considered Options

- **`oauth2ResourceServer` + two filter chains** (public chain without the resource server): rejected — the public chain would *ignore* tokens entirely, so a valid token on a public endpoint would no longer personalise (breaks `isLikedByMe`), and the platform would still run two different JWT mechanisms.
- **Keep content's `/users/me` identity resolution**: rejected by ADR-0001 — a per-request fan-out making user-service a hard dependency of every content call.
- **Fail-closed everywhere (reject any invalid token, even on public endpoints)**: simpler and standard for API products, but wrong UX for a guest-browse community app; rejected in favour of optional auth.

## Consequences

- recommendation-service drops `oauth2ResourceServer` and adopts the custom filter; its public `trending` endpoint is non-personalised today but now also tolerates a stale token (fail-open) for free.
- content-service's auth converges onto this standard (issue #161): custom filter using the `userId` claim, `SecurityConfig` in `config/`, `SecurityErrorHandler` for protected 401s, and the `Authorization`-threading / `/users/me` identity path removed.
- The frontend must short-lived-refresh and clear the token on 401; otherwise an expired token silently degrades a logged-in user to anonymous on public pages (acceptable, but a UX papercut if refresh is not wired).

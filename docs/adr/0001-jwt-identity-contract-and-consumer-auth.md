# JWT identity contract and consumer authentication

## Status

accepted

## Context & Decision

Access tokens are signed by user-service with **HS256 and a shared secret** (`app.jwtSecret`). The token `sub` is the **username**, not a UUID. content-service verifies with the same shared secret and resolves the UUID by calling user-service `/users/me`. recommendation-service, however, was wired as an OAuth2 resource server (`issuer-uri`/JWKS — which nothing issues) and did `UUID.fromString(sub)` on a username, so no real token authenticated and every authenticated request 500'd (issue #150).

We decided:

1. **Identity travels in the token.** user-service adds a `userId` (UUID) claim to the access token; `sub` stays the username for backward compatibility. Consumer services read `userId` from the claim — no per-request fan-out to user-service to resolve identity.
2. **Consumers verify, they don't load.** content-service and recommendation-service verify the HS256 signature with the shared secret using a Spring **`NimbusJwtDecoder.withSecretKey(...)`** (resource-server style) and trust the claims. recommendation-service drops `issuer-uri`.
3. **user-service stays the issuer** and keeps its DB-backed `AuthTokenFilter`, because it alone needs to load mutable, server-side authority/ban state that a stateless decoder cannot carry.

## Considered Options

- **Resolve username→userId via `/users/me` per request** (content-service's current habit): rejected for the recommendation hot paths — it makes user-service a hard dependency of every feed/interaction call.
- **Make `sub` itself the UUID**: rejected — breaks user-service's and content-service's username-based filters; all three services would change at once.

## Consequences

- Tokens minted before this change lack the `userId` claim; users must re-login to obtain it. Acceptable pre-launch.
- recommendation-service adopts the Nimbus-shared-secret consumer pattern **now**; content-service converging onto it (and dropping its `/users/me` identity resolution) is tracked as a separate issue. No `roles` claim is added yet (YAGNI).

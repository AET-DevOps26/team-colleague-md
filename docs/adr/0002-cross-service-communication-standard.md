# Cross-service communication standard

## Status

accepted

## Context & Decision

Services talk over HTTP REST with no shared client library and no service-to-service identity. content-service had the only precedent (`support/Clients.java`: a `RestClient` with timeouts that forwards the caller's `Authorization` header). recommendation-service had no outbound client at all but now needs to call content-service (batch topic names, ranking inputs) and maintain content's cached topic follower counts.

We standardised the consumer side of cross-service calls as:

1. **`RestClient`-per-service.** One thin `@Component` per upstream service (`ContentClient`, `UserClient`) over a configured `RestClient` (connect/read timeouts), with **minimal hand-rolled DTOs** (only the fields actually consumed) rather than importing the upstream OpenAPI spec.
2. **Forward the caller's Bearer token.** Outbound calls reuse the end-user's token; public upstream endpoints are called anonymously. There is **no service identity** (no minted service JWT, no internal shared header) yet.
3. **Writes to another service are async best-effort.** The local DB write is the source of truth and commits first; the cross-service side effect (e.g. the topic Follower Count delta on subscribe/unsubscribe) fires on an `@Async` executor, and failures are logged, never fatal to the user action.

## Considered Options

- **Declarative `@HttpExchange` interfaces**: rejected for now in favour of matching the `RestClient` idiom already in the codebase.
- **Service identity (minted service JWT / internal header)**: deferred. Without it, content's `POST /topics/follower-counts` is callable by any authenticated user (a low-severity count-skew vector). Hardening is tracked as a separate issue.
- **Synchronous / transactional cross-service writes**: rejected — would couple a user's subscribe action to a *different* service's availability for a value that is only a cached denormalisation.

## Consequences

- The Follower Count is eventually-consistent and may drift on outages or dropped async deltas; this is acceptable and reconcilable out-of-band.
- recommendation-service forwards a user token on every upstream call that has a user context; anonymous trending ranking uses only public content endpoints.

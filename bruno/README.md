# Verita API client (Bruno)

A single repo-level [Bruno](https://www.usebruno.com/) collection for **cross-service, token-carrying end-to-end flows** (ADR-0005). Swagger UI (`/swagger-ui.html` on each service) remains the always-synced, per-endpoint contract view; this collection is the thing Swagger UI can't be — one place where a user-service login token flows on into recommendation/content calls.

## Layout

```
bruno/
├── environments/local.bru   # baseUrls + empty `token` + secret `userPassword`
├── user/                    # user-service single-endpoint requests
├── content/                 # content-service single-endpoint requests
├── recommendation/          # recommendation-service single-endpoint requests
├── genai/                   # genai-service single-endpoint requests
└── flows/                   # end-to-end sequences (run in order)
```

## Credentials: structure is committed, secrets are not (ADR-0005)

- The `local` environment ships `baseUrl`s and an **empty** `token`.
- `userPassword` is a **secret var** — its value is entered locally in Bruno and is never written to the committed `.bru` files.
- `userEmail` defaults to a seed user (`alex@example.com`, from `scripts/seed/data/users.ts`); change it to any seeded account.
- `token` is populated **at runtime** by the `Login` request's post-response script — never commit a token.

## Usage

1. Boot the stack (`docker compose up --build`) or run the services locally.
2. In Bruno, select the **local** environment and set the `userPassword` secret var for your seed user.
3. Run **user → Login** (or **flows → 1 Login**). Its script writes `accessToken` into the `token` env var.
4. Any authenticated request (e.g. **recommendation → Personal feed**) sends `Authorization: Bearer {{token}}` automatically — the same token, across services.

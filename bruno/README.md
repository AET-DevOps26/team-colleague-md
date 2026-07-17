# Verita API client (Bruno)

A single repo-level [Bruno](https://www.usebruno.com/) collection (ADR-0005). Two complementary halves:

- **`flows/`** — the core deliverable: cross-service, **token-carrying end-to-end journeys**, one folder per P0/P1/P2 user story. This is the thing Swagger UI can't be — a user-service login token flowing on into content / recommendation / genai calls.
- **`user/ content/ recommendation/ genai/`** — a single-endpoint **palette**, one request per P0/P1/P2 user-story endpoint, for ad-hoc poking. Swagger UI (`/swagger-ui.html` per service) stays the always-synced, exhaustive contract view; this palette is hand-maintained and intentionally story-scoped.

## Layout

```
bruno/
├── environments/        # local · azure-vm · k8s-dev · k8s-prod
├── fixtures/onepx.png   # 1×1 PNG for avatar / file-upload steps
├── user/  content/  recommendation/  genai/   # single-endpoint palette
└── flows/               # end-to-end journeys, one subfolder per story:
    ├── 1-auth/          register → login → me → refresh → logout
    ├── 2-authoring/     create → get → edit → drafts → own posts → delete
    ├── 3-engagement/    comment/reply/like/bookmark + lists + cleanup
    ├── 4-discovery/     guest browse: posts/search/topics/trending
    ├── 5-personalization/ subscribe + personal feed + track (+ cleanup)
    ├── 6-profile/       me → update → avatar → preferences → public profile
    ├── 7-moderation/    admin user mgmt: list / role / ban (user-admin only)
    ├── 8-genai/         summarize → digest generate → poll job
    └── 9-internal-service/ X-Internal-Service-Token endpoints
```

Each flow is **self-contained** (its own Login at step 1), **self-provisions** the data it touches, and **cleans up** (paired delete/unbookmark/unsubscribe/unban). Steps are ordered `.bru` files; minor login duplication across flows is accepted for independence.

## Environments

Four environments. The per-service `baseUrl` absorbs the [gateway path-prefix](../docs/infrastructure/API_Gateway_Routing.md) so request files stay environment-agnostic (`{{userBaseUrl}}/api/v1/...`):

| Env | `userBaseUrl` | Prefix |
|---|---|---|
| `local` | `http://localhost:8081` | none (direct) |
| `azure-vm` | `http://<AZURE_PUBLIC_IP>/user` | `/user` `/content` `/recommendation` `/genai` |
| `k8s-dev` | `https://dev.verita.stud.k8s.aet.cit.tum.de/user` | same |
| `k8s-prod` | `https://verita.stud.k8s.aet.cit.tum.de/user` | same |

> The Azure VM IP changes when the VM is rebuilt; the authoritative value is the
> `AZURE_PUBLIC_IP` GitHub Actions variable. The committed `environments/azure-vm.bru`
> carries the last-known IP — update its four `*BaseUrl` vars after a rebuild.

## Credentials: structure is committed, secrets are not (ADR-0005)

- `userPassword` is a **secret var** in every environment — entered locally in Bruno, never written to the committed `.bru` files. For `local` use the seed password `Password123!` (`scripts/seed/services/users/usersData.ts`).
- `internalServiceToken` is a **committed plaintext dev default in `local`** (`dev-only-internal-service-token`, ADR-0007), but a **secret var in `azure-vm` / `k8s-dev` / `k8s-prod`** — a real secret there, filled locally.
- `token` and the other capture vars (`ownUserId`, `otherUserId`, `postId`, `commentId`, `topicId`, `jobId`, `flow*`) are **runtime-only** — populated by post-response scripts, never committed.
- `userEmail` defaults to a seed user (`alex@example.com`, an ADMIN — required by the moderation flow). `otherUsername` defaults to `sarahjkim`.

## Usage

### In the Bruno app
1. Boot the stack (`docker compose up --build`) or run the services locally; seed the DB.
2. Select an environment and set the `userPassword` secret var (and `internalServiceToken` for non-`local` envs).
3. **Run Login once per environment first** — `user → Login` (or any flow's step 1) writes `accessToken` into `token`. Every authenticated request then sends `Authorization: Bearer {{token}}` — the same token, across services.

### Headless (CI / smoke)
```bash
# the green end-to-end deliverable — runs every flow in order against local:
npx @usebruno/cli run flows --env local
```
`bru run flows` is the green target (self-contained, self-provisioning). The single-endpoint palette uses placeholder IDs (`{{postId}}` …) and is meant for individual, after-a-flow use — don't expect `bru run user/` to pass cold.

## LLM / async boundary

A booted stack is asserted only for what it guarantees **without external LLM creds**: status codes, schema-field presence, and the cross-service identity fact (200-not-401). LLM output is **never** asserted:

- **authoring** never asserts post summary content — `SummaryEventListener` populates it asynchronously, best-effort, and only with live creds.
- **genai** asserts acceptance (`summarize` → 200; `digests/generate` → 202 + `jobId`; poll → `status` field present), never the generated text. `summarize` is synchronous and **needs LLM creds to return 200**; `digests/generate` queues without an LLM call.

## Out of scope (no endpoint exists yet)

- **User verification flow** (submit / admin approve-reject) — no endpoint in any spec (W6 backlog).
- **Admin remove others' post** — `PostService.deletePost` is author-only (`mustOwnEditablePost`); no admin-removal endpoint.
- **Notifications** (recommendation `/notifications*`) — P2, deferred; not yet exercised.

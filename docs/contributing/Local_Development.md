# Local Development

How to run and develop the individual services outside the all-in-one
`docker compose up --build` flow described in the [root README](../../README.md).

## Prerequisites

- Node.js 22+ and npm (frontend and seed tooling; CI builds on Node 24)
- Java 25 (backend services — Spring Boot 4)
- Python 3.12+ and `pip` (genai-service)
- Docker & Docker Compose

Optional but recommended — install the repo's pre-commit hooks (whitespace/EOF fixers and
OpenAPI linting, the same checks CI runs):

```bash
pip install pre-commit
pre-commit install
```

## Backend Infrastructure (Databases & Object Storage)

When running individual backend services locally, start the required infrastructure first.
Each backend service has its own database, so start the one(s) you need (or all of them):

```bash
# All three service databases + MinIO (object storage) with bucket initialisation
docker compose up -d user-db content-db recommendation-db minio minio-init
```

**PostgreSQL connection details** (each database is published on a distinct host port):

| Database | Host:Port | Database name | User | Password |
|---|---|---|---|---|
| `user-db` | `localhost:5432` | `verita_users` | `svc_user` | `svc_user_password` |
| `content-db` | `localhost:5433` | `verita_contents` | `svc_content` | `svc_content_password` |
| `recommendation-db` | `localhost:5434` | `verita_recommendations` | `svc_recommendation` | `svc_recommendation_password` |

**MinIO connection details:**

| Property | Value |
|---|---|
| API endpoint | `http://localhost:9000` |
| Console (browser) | `http://localhost:9001` |
| Root access key | `verita_minio` |
| Root secret key | `verita_minio_password` |

The root credentials log in to the console. The services themselves use scoped,
least-privilege S3 users (`user-service` / `content-service`) created by `minio-init`,
each restricted to its own bucket (`verita-user-portraits` / `verita-post-photos`); these
defaults are already wired into each service's `application-dev.properties`.

**Mail:** the Compose stack includes [Mailpit](https://mailpit.axllent.org/) as a local
SMTP sink for the password-reset flow — no real mail is sent. Browse captured mail at
`http://localhost:8025`; SMTP listens on `localhost:1025` (the bare-`bootRun` default in
`application.properties`), so `docker compose up -d mailpit` is enough when working on the
password-reset flow outside Compose.

## Local Seed Data

The repository includes a cross-platform TypeScript seed command for local demo data. It
expects PostgreSQL and MinIO to already be running and fails with a clear message if they
are not reachable.

```bash
docker compose up -d user-db content-db recommendation-db minio minio-init user-service content-service recommendation-service
npm install
npm run seed:local
```

The default seed runs domains in order: `users`, `content`, then `recommendations`.

- `users` creates 8 curated users, uploads default avatar PNGs to the existing
  `verita-user-portraits` MinIO bucket with user-service storage credentials, and
  stores public avatar URLs.
- `content` creates frontend-inspired posts with topics, source URLs, comments,
  bookmarks, post-like votes, and 6 local PNG cover images in the existing
  `verita-post-photos` bucket with content-service storage credentials. Cover images
  are written under the `seed-post-covers/` object prefix.
- `recommendations` creates topic follows, user follows, sampled interactions, and
  notifications that reference the seeded users/content.

The seed writes directly to local databases, so each Spring service must have started
once to let Hibernate/Flyway create the required tables. The seed is idempotent and
non-destructive for unrelated local data: known seeded fixtures are overwritten by their
fixed IDs or scoped keys, while unrelated rows are left alone.

If a database rejects the documented credentials after pulling newer Compose settings,
your local Postgres volume may have been initialized with older credentials. Recreate the
local volumes (`docker compose down -v`) only if you are comfortable deleting local
database data.

Seeded users are login-capable with this shared dev-only password:

```text
Password123!
```

Useful options:

```bash
npm run seed:local -- --dry-run
npm run seed:local -- --only users
npm run seed:local -- --only content
npm run seed:local -- --only recommendations
npm run seed:local -- --dry-run --only users,content,recommendations
npm run seed:local -- --reset            # purge stale seed rows, then re-seed
npm run seed:local -- --reset --dry-run  # preview what --reset would delete
```

The seed **upserts by id**, so fixtures removed in a newer seed would otherwise
linger. `--reset` deletes seed-owned rows first (users with `@example.com` emails
and the data they own, plus system digests), resolving ownership from the live DB
so stale rows from earlier fixtures are caught — while data created by real users
is preserved. Topics are left intact (shared; their counters are recomputed on
re-seed). `--reset` honors `--only` and, with `--dry-run`, reports counts without
mutating anything.

Connection defaults match `docker-compose.yml` and can be overridden:

| Variable | Default |
|---|---|
| `USER_DB_HOST` | `localhost` |
| `USER_DB_PORT` | `5432` |
| `USER_DB_NAME` | `verita_users` |
| `USER_DB_USER` | `svc_user` |
| `USER_DB_PASSWORD` | `svc_user_password` |
| `CONTENT_DB_HOST` | `localhost` |
| `CONTENT_DB_PORT` | `5433` |
| `CONTENT_DB_NAME` | `verita_contents` |
| `CONTENT_DB_USER` | `svc_content` |
| `CONTENT_DB_PASSWORD` | `svc_content_password` |
| `RECOMMENDATION_DB_HOST` | `localhost` |
| `RECOMMENDATION_DB_PORT` | `5434` |
| `RECOMMENDATION_DB_NAME` | `verita_recommendations` |
| `RECOMMENDATION_DB_USER` | `svc_recommendation` |
| `RECOMMENDATION_DB_PASSWORD` | `svc_recommendation_password` |
| `STORAGE_S3_ENDPOINT` | `http://localhost:9000` |
| `STORAGE_S3_PUBLIC_ENDPOINT` | `http://localhost:9000` |
| `USER_STORAGE_S3_ENDPOINT` | falls back to `STORAGE_S3_ENDPOINT` |
| `USER_STORAGE_S3_PUBLIC_ENDPOINT` | falls back to `STORAGE_S3_PUBLIC_ENDPOINT` |
| `USER_STORAGE_S3_ACCESS_KEY` | `user-service` |
| `USER_STORAGE_S3_SECRET_KEY` | `user-service-s3-secret` |
| `USER_PORTRAITS_BUCKET` | `verita-user-portraits` |
| `CONTENT_STORAGE_S3_ENDPOINT` | falls back to `STORAGE_S3_ENDPOINT` |
| `CONTENT_STORAGE_S3_PUBLIC_ENDPOINT` | falls back to `STORAGE_S3_PUBLIC_ENDPOINT` |
| `CONTENT_STORAGE_S3_ACCESS_KEY` | `content-service` |
| `CONTENT_STORAGE_S3_SECRET_KEY` | `content-service-s3-secret` |
| `CONTENT_POST_PHOTOS_BUCKET` | `verita-post-photos` |

### Seeding Remote Environments (verita-dev & Azure VM)

The same seed runs against the deployed demo environments — only the connectivity
and credentials differ, so the core script is reused unchanged via two wrappers:

```bash
# verita-dev (Rancher): port-forwards in-cluster Postgres + MinIO, uses the
# committed dev credentials — no `kubectl get secret` or GitHub secret access.
npm run seed:rancher

# Azure VM (prod compose): ships the seed over SSH and runs it in a one-off
# node container on the compose network, reading the VM's Ansible-written .env.
VM_HOST=<public-ip> ./scripts/seed-vm.sh

# Both wrappers accept SEED_RESET=1 to purge stale seed rows before re-seeding
# (same semantics as `seed:local -- --reset`):
SEED_RESET=1 npm run seed:rancher
VM_HOST=<public-ip> SEED_RESET=1 ./scripts/seed-vm.sh
```

`seed:rancher` is guarded to `verita-dev` only; seeding the real prod namespace is
intentionally unsupported. See
[Seeding Remote Environments](../infrastructure/Seeding_Remote_Environments.md)
for prerequisites, scope, and troubleshooting.

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Default dev server: `http://localhost:3000` (the Vite proxy forwards `/user`, `/content`,
`/recommendation`, and `/genai` to the local backends). All data comes from the real
backend — there is no in-app mock layer — so start and seed the backend first. See
[`frontend/README.md`](../../frontend/README.md) for scripts, structure, and the design
reference; frontend test layers are covered in
[Frontend Testing](../testing/Frontend_Testing.md).

---

## Backend — User Service

Start infrastructure first (see
[Backend Infrastructure](#backend-infrastructure-databases--object-storage) above), then:

```bash
cd backend/user-service
./gradlew bootRun    # Windows: .\gradlew.bat bootRun
```

Health check: `http://localhost:8081/actuator/health`

A bare `bootRun` uses the default `dev` profile, which connects to `user-db` on
`localhost:5432` with the `svc_user` credentials and falls back to the shared dev `JWT_SECRET`
and internal-service token — so it interoperates with the other services out of the box.
Override `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` to point at another
PostgreSQL instance. User portrait storage uses the MinIO defaults in
`application-dev.properties`; start MinIO with `docker compose up -d minio minio-init` when
working on portrait uploads locally.

> The `prod` profile is for Docker Compose / Helm: it has **no** built-in secrets and
> requires `JWT_SECRET`, `INTERNAL_SERVICE_TOKEN`, and the `DB_*` / S3 variables to be
> injected by the environment.

---

## Backend — Content Service

Start infrastructure first, then point the service at `content-db` (published on host port
`5433`):

```bash
cd backend/content-service
DB_PORT=5433 ./gradlew bootRun    # Windows: $env:DB_PORT=5433; .\gradlew.bat bootRun
```

Health check: `http://localhost:8082/actuator/health`

The `dev` profile defaults to `localhost:5432`, so `DB_PORT=5433` is required to reach the
Compose `content-db`. Post photo storage uses the MinIO defaults in
`application-dev.properties`; start MinIO with `docker compose up -d minio minio-init` when
working on post photo uploads locally.

---

## Backend — Recommendation Service

Start infrastructure first, then point the service at `recommendation-db` (published on host
port `5434`):

```bash
cd backend/recommendation-service
DB_PORT=5434 ./gradlew bootRun    # Windows: $env:DB_PORT=5434; .\gradlew.bat bootRun
```

Health check: `http://localhost:8083/actuator/health`

The `dev` profile defaults to `localhost:5432`, so `DB_PORT=5434` is required to reach the
Compose `recommendation-db`.

---

## GenAI Service

```bash
cd genai-service
cp .env.example .env    # first time only — add an LLM API key to enable AI features
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health check: `http://localhost:8000/health`

The service starts without a real API key (health and docs respond), but summarization and
digest generation need a valid provider key in `.env`. For the TUM Logos endpoint, use
`LLM_PROVIDER=logos`, `LLM_MODEL=openai/gpt-oss-120b`, and `LOGOS_API_KEY`; the endpoint is
only reachable from the TUM network or eduVPN. Provider configuration, admin-panel testing,
and troubleshooting are covered in [GenAI Environment Setup](GenAI_Environment_Setup.md).

---

## API Client (Bruno)

The repo ships a [Bruno](https://www.usebruno.com/) collection under
[`bruno/`](../../bruno/README.md) with per-service folders and environments for local,
Azure VM, and Rancher — useful for exercising endpoints without the frontend.

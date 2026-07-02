# team-colleague-md - Verita Platform
[![API Docs](https://img.shields.io/badge/API-Documentation-blue)](https://AET-DevOps26.github.io/team-colleague-md/)

Verita is an AI-focused community platform where developers, researchers, and enthusiasts
share and discover practical AI knowledge through intelligent curation, automated
summarization, and personalized recommendations. It is built as four backend microservices
(Spring Boot + FastAPI) behind a React frontend.

## Quick Start with Docker Compose (Local)

The fastest way to run the full platform.

**First-time setup.** Create `genai-service/.env` from the template (the placeholder values
are enough to boot; add a real LLM API key such as `NVIDIA_NIM_API_KEY` or `LOGOS_API_KEY`
to enable AI summaries and the daily digest):

```bash
cp genai-service/.env.example genai-service/.env
```

Run the docker compose from the repository root:

```bash
docker compose up --build
```

This builds the application services plus one PostgreSQL database per service and MinIO
object storage:

| Service | URL | Description |
|---|---|---|
| `frontend` | http://localhost:3000 | React UI (served by nginx) |
| `user-service` | http://localhost:8081 | Spring Boot — user identity & auth |
| `content-service` | http://localhost:8082 | Spring Boot — posts, comments & topics |
| `recommendation-service` | http://localhost:8083 | Spring Boot — feeds & notifications |
| `genai-service` | http://localhost:8000 | FastAPI — AI summaries & daily digest |
| `user-db` | localhost:5432 | PostgreSQL — user-service data |
| `content-db` | localhost:5433 | PostgreSQL — content-service data |
| `recommendation-db` | localhost:5434 | PostgreSQL — recommendation-service data |
| `minio` | http://localhost:9000 | S3-compatible object storage API |
| `minio` console | http://localhost:9001 | Object storage admin UI |

MinIO starts with two buckets and a scoped, least-privilege S3 user per service. Root console
credentials, connection details, and the storage rationale live in
[Backend Infrastructure](#backend-infrastructure-databases--object-storage) below.

Common lifecycle commands:

```bash
docker compose down                       # stop all services (data is kept)
docker compose down -v                    # stop and delete all data (DBs + object storage)
docker compose up --build user-service    # start a single service only
```

### Seed Demo Data

A fresh stack starts empty. Once the services are healthy, seed the local databases with
demo users, posts, topics, comments, bookmarks, votes, follows, and notifications:

```bash
npm install
npm run seed:local
```

The seed is idempotent and non-destructive. See [Local Seed Data](#local-seed-data) for the
full breakdown and options (`--dry-run`, `--only`).

### Log In and Explore Checklist (for 2.Review)

Open `http://localhost:3000` and sign in as **`alexchen`** (email `alex@example.com`, password `Password123!`). This admin account is seeded with content across every area, so you can walk through all of the features in the feature [check list](docs/Check_List.md).

### Health Checks

All services run Docker health checks every 30 seconds and expose a status endpoint:

```text
http://localhost:8081/actuator/health   # user-service
http://localhost:8082/actuator/health   # content-service
http://localhost:8083/actuator/health   # recommendation-service
http://localhost:8000/health            # genai-service
```

### Monitoring (optional)

Layer a Prometheus + Grafana stack on top of the dev stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.monitoring.local.yml up -d
# Grafana http://localhost:3001 log in with (admin / verita_grafana_admin)
# Prometheus http://localhost:9090
```

See [`infra/monitoring/README.md`](infra/monitoring/README.md) for what is collected and the Azure/Kubernetes variants.

---

## Cloud Deployments

Live environments:

| Environment | URL | Platform |
|---|---|---|
| Production | https://verita.stud.k8s.aet.cit.tum.de/ | Kubernetes (Rancher) |
| Development | https://dev.verita.stud.k8s.aet.cit.tum.de/ | Kubernetes (Rancher) |
| Azure VM | http://20.91.194.13/ | Docker Compose on a single VM |

> Note: Dont forget to type `thisisunsafe` when the browser warns about the self-signed TLS certificate on the verita-dev environments.

See [Infrastructure Design](docs/Infrastructure_Design.md) and the
[Helm Chart](infra/helm/verita/README.md) for how these are provisioned and deployed.

---

## Documentation

Project-wide documentation lives under [`docs/`](docs/); component and tooling docs live next
to the code they describe.

### Architecture & Product

| Document | What's inside |
|---|---|
| [Problem Statement](docs/Problem_Statement.md) | The problem Verita solves, target users, and epics/user stories |
| [System Overview & Architecture](docs/System_Overview_Architecture.md) | Services, technology decisions, data architecture, UML diagrams, product backlog |
| [API Gateway & Routing](docs/API_Gateway_Routing.md) | Path-prefix routing pattern across local, Azure, and Kubernetes |
| [Infrastructure Design](docs/Infrastructure_Design.md) | Deployment toolchain and infrastructure goals |
| [Project Plan](docs/Project_Plan.md) | Milestones, scope, and team plan |
| [Frontend PRD](docs/Frontend_PRD.md) | Product requirements for the web client |


### Database

| Document | What's inside |
|---|---|
| [Schema Overview](docs/database/schema.md) | Database-per-service model and cross-service reference rules |
| [User Service Schema](docs/database/user_service_schema.md) | `verita_users` tables |
| [Content Service Schema](docs/database/content_service_schema.md) | `verita_contents` tables |
| [Recommendation Service Schema](docs/database/recommendation_service_schema.md) | `verita_recommendations` tables |

### Testing & Workflow

| Document | What's inside |
|---|---|
| [Testing Strategy](docs/Testing.md) | Backend test tooling, coverage gates, and how to run tests per service |
| [Frontend Testing](docs/Frontend_Testing.md) | Unit, component, and end-to-end test layers for the frontend |
| [Git Branching Guide](docs/Git_Branching_Guide.md) | Branch naming and pull-request workflow |

### Operations & Tooling

| Document | What's inside |
|---|---|
| [Frontend](frontend/README.md) | React app — dev scripts, demo mode, and structure |
| [Monitoring](infra/monitoring/README.md) | Prometheus + Grafana stack for Compose and Kubernetes |
| [Helm Chart](infra/helm/verita/README.md) | Kubernetes deployment via the `verita` umbrella chart |
| [API Client (Bruno)](bruno/README.md) | Repo-level Bruno collection for exercising the APIs |
| [Seeding Remote Environments](docs/Seeding_Remote_Environments.md) | Running the seed against verita-dev and the Azure VM |

## Demo Accounts

Authentication is always against the real backend. Seed the database (`scripts/seed`) to create the demo users, then log in at `http://localhost:3000` after `docker compose up --build`. All seed users share the password `Password123!`.

| Display Name | Username | Role |
|---|---|---|
| Alex Chen | `alexchen` | Admin |
| Sarah Kim | `sarahjkim` | Verified |
| Marcello Rossi | `marcello_r` | User |

Profiles (bio, organisation, expertise areas) come from the seed. Posts, bookmarks, and liked-posts tabs are populated only once content-service is seeded — to preview a populated UI before then, start the frontend in **demo mode** (`npm run dev:demo`), which keeps auth real but fills those data-sparse tabs from a mock display layer (see ADR-0011).

---

## Local Development

### Prerequisites

- Node.js and npm (for frontend)
- Java 25 (for backend services — Spring Boot 4)
- Python 3.12+ and `pip` (for genai-service)
- Docker & Docker Compose

### Backend Infrastructure (Databases & Object Storage)

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

The root credentials log in to the console. The services themselves use scoped S3 users
(`user-service` / `content-service`) created by `minio-init`; these defaults are already
wired into each service's `application-dev.properties`.

### Local Seed Data

The repository includes a cross-platform TypeScript seed command for local mock data. It
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
local volumes only if you are comfortable deleting local database data.

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
```

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

#### Seeding Remote Environments (verita-dev & Azure VM)

The same seed runs against the deployed demo environments — only the connectivity
and credentials differ, so the core script is reused unchanged via two wrappers:

```bash
# verita-dev (Rancher): port-forwards in-cluster Postgres + MinIO, uses the
# committed dev credentials — no `kubectl get secret` or GitHub secret access.
npm run seed:rancher

# Azure VM (prod compose): ships the seed over SSH and runs it in a one-off
# node container on the compose network, reading the VM's Ansible-written .env.
VM_HOST=<public-ip> ./scripts/seed-vm.sh
```

`seed:rancher` is guarded to `verita-dev` only. Seeding the real prod namespace is
intentionally unsupported. See [Seeding Remote Environments](docs/Seeding_Remote_Environments.md)
for prerequisites, scope, and troubleshooting.

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Default dev server: `http://localhost:3000`. See [`frontend/README.md`](frontend/README.md)
for demo-mode auto-login scripts (`npm run dev:alice` / `dev:bob`) and project structure.

---

### Backend — User Service

Start infrastructure first (see [Backend Infrastructure](#backend-infrastructure-databases--object-storage) above), then:

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

### Backend — Content Service

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

### Backend — Recommendation Service

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

### GenAI Service

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
only reachable from the TUM network or eduVPN.

---

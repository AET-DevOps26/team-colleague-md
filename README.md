# team-colleague-md - Verita Platform
[![API Docs](https://img.shields.io/badge/API-Documentation-blue)](https://AET-DevOps26.github.io/team-colleague-md/)

Verita is an AI-focused community platform where developers, researchers, and enthusiasts
share and discover practical AI knowledge through intelligent curation, automated
summarization, and personalized recommendations. It is built as four backend microservices
(Spring Boot + FastAPI) behind a React frontend.

## Quick Start with Docker Compose (Local)

The fastest way to run the full platform.

**First-time setup.** Create `genai-service/.env` from the template (the placeholder values
are enough to boot; add a real `NVIDIA_NIM_API_KEY` to enable AI summaries and the daily
digest):

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

> **Note:** Postgres applies its credentials only on the *first* startup of an empty data
> volume — see the note at the top of [`docker-compose.yml`](docker-compose.yml) if you change
> DB credentials against an existing volume.

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

See [Infrastructure Design](docs/Infrastructure_Design.md) and the
[Helm Chart](infra/helm/verita/README.md) for how these are provisioned and deployed.

---

## Check List (2.Review)
- Sign up and login


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

<!-- ## Demo Accounts

Two built-in demo accounts let you explore the frontend without a backend — they are handled
entirely client-side, so they work at the deployed frontend or at `http://localhost:3000`
after running `docker compose up --build`. Real accounts are created through **Sign Up**.

| Display Name | Email | Password | Role |
|---|---|---|---|
| Alice Morgan | `alice@verita.demo` | `demo1234` | Verified |
| Bob Nakamura | `bob@verita.demo` | `demo1234` | User |

Both demo accounts have complete profiles (bio, organisation, expertise areas) and populated
posts, bookmarks, and liked-posts tabs in the User Profile page. -->

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
docker compose up -d user-db minio minio-init user-service
npm install
npm run seed:local
```

The first seed domain creates 8 curated users, uploads their default avatar PNGs to the
existing `verita-user-portraits` MinIO bucket, and stores public avatar URLs on the user
rows. It is idempotent and non-destructive for unrelated local users: known seeded users
are updated by their fixed UUIDs, but identity conflicts on username/email fail instead of
rewriting primary keys.

The seed writes directly to the local user database, so `user-service` must have started
once to let Flyway create the `users` and `user_expertise` tables.

Seeded users are login-capable with this shared dev-only password:

```text
Password123!
```

Useful options:

```bash
npm run seed:local -- --dry-run
npm run seed:local -- --only users
npm run seed:local -- --dry-run --only users
```

Connection defaults match `docker-compose.yml` and can be overridden:

| Variable | Default |
|---|---|
| `USER_DB_HOST` | `localhost` |
| `USER_DB_PORT` | `5432` |
| `USER_DB_NAME` | `verita_users` |
| `USER_DB_USER` | `svc_user` |
| `USER_DB_PASSWORD` | `svc_user_password` |
| `MINIO_ENDPOINT` | `http://localhost:9000` |
| `MINIO_PUBLIC_ENDPOINT` | `http://localhost:9000` |
| `MINIO_ACCESS_KEY` | `verita_minio` |
| `MINIO_SECRET_KEY` | `verita_minio_password` |
| `USER_PORTRAITS_BUCKET` | `verita-user-portraits` |

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
digest generation need a valid `NVIDIA_NIM_API_KEY` — or another provider selected via
`LLM_PROVIDER` — in `.env`.

---

# Verita
[![API Docs](https://img.shields.io/badge/API-Documentation-blue)](https://AET-DevOps26.github.io/team-colleague-md/)

Verita is an AI-focused community platform where developers, researchers, and enthusiasts
share and discover practical AI knowledge through intelligent curation, automated
summarization, and personalized recommendations. It is built as four backend microservices
(Spring Boot + FastAPI) behind a React frontend.

> **Reviewing the project?** Start with the **[Review Guide](docs/Review_Guide.md)** — a
> guided walkthrough with an explore checklist, health checks, and how to view monitoring.

## Quick Start with Docker Compose (Local)

The fastest way to run the full platform.

**First-time setup.** Create `genai-service/.env` from the template (the placeholder values
are enough to boot; add a real LLM API key such as `NVIDIA_NIM_API_KEY` or `LOGOS_API_KEY`
to enable AI summaries and the daily digest):

```bash
cp genai-service/.env.example genai-service/.env
```

Run docker compose from the repository root:

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
| `minio` console | http://localhost:9001 | Object storage admin UI |

Common lifecycle commands:

```bash
docker compose down                       # stop all services (data is kept)
docker compose down -v                    # stop and delete all data (DBs + object storage)
docker compose up --build user-service    # start a single service only
```

For prerequisites, per-service builds, database/MinIO connection details, and running
services outside Compose, see **[Local Development](docs/contributing/Local_Development.md)**.

### Seed Demo Data

A fresh stack starts empty. Once the services are healthy, seed the local databases with
demo users, posts, topics, comments, bookmarks, votes, follows, and notifications:

```bash
npm install
npm run seed:local
```

The seed is idempotent and non-destructive. See
[Local Development](docs/contributing/Local_Development.md#local-seed-data) for the full
breakdown and options (`--dry-run`, `--only`, `--reset`), and
[Seeding Remote Environments](docs/infrastructure/Seeding_Remote_Environments.md) for the
deployed demo environments.

### Monitoring (optional)

Layer a Prometheus + Grafana stack on top of the local dev stack:

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.monitoring.local.yml up -d
# Grafana     http://localhost:3001   (admin / verita_grafana_admin)
# Prometheus  http://localhost:9090
```

Grafana also runs on the **Rancher** deployments behind the shared ingress at `/grafana`
(e.g. `https://dev.verita.stud.k8s.aet.cit.tum.de/grafana`). See
[`infra/monitoring/README.md`](infra/monitoring/README.md) for what is collected and the
Azure / Kubernetes variants.

---

## Cloud Deployments

Live environments:

| Environment | URL | Platform |
|---|---|---|
| Production | https://verita.stud.k8s.aet.cit.tum.de/ | Kubernetes (Rancher) |
| Development | https://dev.verita.stud.k8s.aet.cit.tum.de/ | Kubernetes (Rancher) |
| Azure VM | see the `AZURE_PUBLIC_IP` GitHub Variable | Docker Compose on a single VM |

> The Azure VM IP is **not hardcoded** here because it changes whenever the VM is rebuilt.
> The authoritative value is the `AZURE_PUBLIC_IP` GitHub Actions Variable (also used by the
> deploy pipeline); see [Infrastructure Design](docs/infrastructure/Infrastructure_Design.md).

> Note: type `thisisunsafe` if the browser warns about the self-signed TLS certificate on the
> verita-dev environment.

See [Infrastructure Design](docs/infrastructure/Infrastructure_Design.md) and the
[Helm Chart](infra/helm/verita/README.md) for how these are provisioned and deployed.

---

## Demo Accounts

Authentication is always against the real backend. Seed the database (see above) to create
the demo users, then log in at `http://localhost:3000`. All seed users share the password
`Password123!`.

| Display Name | Username | Role |
|---|---|---|
| Alex Chen | `alexchen` | Admin |
| Sarah Kim | `sarahjkim` | Verified |
| Marcello Rossi | `marcello_r` | User |

`alexchen` is seeded with content across every feature area — sign in as `alexchen`
(email `alex@example.com`) to walk through the whole product.

---

## Documentation

The full documentation index lives in **[`docs/`](docs/README.md)**. Highlights:

| Area | Entry point |
|---|---|
| Reviewers | [Review Guide](docs/Review_Guide.md) · [Integration Check List](docs/Check_List.md) |
| Architecture & product | [System Overview & Architecture](docs/architecture/System_Overview_Architecture.md) · [Problem Statement](docs/product/Problem_Statement.md) · [Frontend PRD](docs/product/Frontend_PRD.md) |
| Infrastructure | [Infrastructure Design](docs/infrastructure/Infrastructure_Design.md) · [API Gateway & Routing](docs/infrastructure/API_Gateway_Routing.md) · [Seeding Remote Environments](docs/infrastructure/Seeding_Remote_Environments.md) |
| Testing | [Backend Testing](docs/testing/Testing.md) · [Frontend Testing](docs/testing/Frontend_Testing.md) |
| Contributing | [Local Development](docs/contributing/Local_Development.md) · [Git Branching Guide](docs/contributing/Git_Branching_Guide.md) |
| Component & tooling | [Frontend](frontend/README.md) · [Monitoring](infra/monitoring/README.md) · [Helm Chart](infra/helm/verita/README.md) · [API Client (Bruno)](bruno/README.md) |

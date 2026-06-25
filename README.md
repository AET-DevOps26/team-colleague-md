# team-colleague-md - Verita Platform
[![API Docs](https://img.shields.io/badge/API-Documentation-blue)](https://AET-DevOps26.github.io/team-colleague-md/)

Technical documentation for all Verita microservices.

## Demo Accounts

Authentication is always against the real backend. Seed the database (`scripts/seed`) to create the demo users, then log in at `http://localhost:3000` after `docker compose up --build`. All seed users share the password `Password123!`.

| Display Name | Username | Role |
|---|---|---|
| Alex Chen | `alexchen` | Admin |
| Sarah Kim | `sarahjkim` | Verified |
| Marcello Rossi | `marcello_r` | User |

Profiles (bio, organisation, expertise areas) come from the seed. Posts, bookmarks, and liked-posts tabs are populated only once content-service is seeded — to preview a populated UI before then, start the frontend in **demo mode** (`npm run dev:demo`), which keeps auth real but fills those data-sparse tabs from a mock display layer (see ADR-0011).

## Docker Compose (Recommended)

The fastest way to run the full platform. From the repository root:

```bash
docker compose up --build
```

This builds and starts the application services plus PostgreSQL and MinIO object storage:

| Service | URL | Description |
|---|---|---|
| `frontend` | http://localhost:3000 | React UI (served by nginx) |
| `user-service` | http://localhost:8081 | Spring Boot — user identity & auth |
| `user-db` | localhost:5432 | PostgreSQL — persistent user data |
| `minio` | http://localhost:9000 | S3-compatible object storage API |
| `minio` console | http://localhost:9001 | Object storage admin UI |
| `content-service` | http://localhost:8082 | Spring Boot — posts & content |
| `recommendation-service` | http://localhost:8083 | Spring Boot — feeds & notifications |
| `genai-service` | http://localhost:8000 | FastAPI — AI features |

MinIO development credentials are `verita_minio` / `verita_minio_password`.
On startup, Compose creates two buckets:

| Bucket | Used for |
|---|---|
| `verita-user-portraits` | User portrait/avatar objects owned by `user-service` |
| `verita-post-photos` | Post photo/cover objects owned by `content-service` |

To stop all services:

```bash
docker compose down
```

User data is stored in the named Docker volume `team-colleague-md_user-db-data`.
Object storage data is stored in `team-colleague-md_minio-data`.
To remove persistent database and object storage data as well:

```bash
docker compose down -v
```

To start a single service only:

```bash
docker compose up --build user-service
```

### Health Checks

All services are configured with Docker health checks that run automatically every 30 seconds. Once started, the Spring Boot services expose their health status at `/actuator/health`:

```text
http://localhost:8081/actuator/health   # user-service
http://localhost:8082/actuator/health   # content-service
http://localhost:8083/actuator/health   # recommendation-service
http://localhost:8000/health            # genai-service
```

Health check activity is visible in the compose log output. The frontend (nginx) logs every health probe as an access log line (`GET / HTTP/1.1 200`). The Spring Boot services run their checks silently — no log line appears unless the check fails, which is expected behavior.

---

## Local Development

### Prerequisites

- Node.js and npm (for frontend)
- Java 25 (for backend services)
- Python 3.11+ and `pip` (for genai-service)
- Docker & Docker Compose

### Backend Infrastructure (Database & Object Storage)

When running individual backend services locally, start the required infrastructure first:

```bash
# PostgreSQL for user-service
docker compose up -d user-db

# MinIO object storage + bucket initialisation (needed for portrait/photo uploads)
docker compose up -d minio minio-init
```

Or start both at once:

```bash
docker compose up -d user-db minio minio-init
```

**PostgreSQL connection details:**

| Property | Value |
|---|---|
| Host | `localhost:5432` |
| Database | `verita_users` |
| User | `verita_user` |
| Password | `verita_password` |

**MinIO connection details:**

| Property | Value |
|---|---|
| API endpoint | `http://localhost:9000` |
| Console (browser) | `http://localhost:9001` |
| Access key | `verita_minio` |
| Secret key | `verita_minio_password` |

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

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Default dev server: `http://localhost:3000`

---

### Backend — User Service

Start infrastructure first (see [Backend Infrastructure](#backend-infrastructure-database--object-storage) above), then:

```bash
cd backend/user-service
./gradlew bootRun    # Windows: .\gradlew.bat bootRun
```

Health check: `http://localhost:8081/actuator/health`

Local `bootRun` uses the default `dev` Spring profile with PostgreSQL. Start `user-db`
first, or provide `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` for another
PostgreSQL instance. User portrait storage uses the MinIO defaults in
`application.properties`; start MinIO with `docker compose up -d minio minio-init` when
working on portrait uploads locally.

To run with the production profile:

```bash
cd backend/user-service
DB_HOST=localhost DB_NAME=verita_users DB_USER=verita_user DB_PASSWORD=verita_password ./gradlew bootRun --args="--spring.profiles.active=prod"
```

---

### Backend — Content Service

Start infrastructure first (see [Backend Infrastructure](#backend-infrastructure-database--object-storage) above), then:

```bash
cd backend/content-service
./gradlew bootRun    # Windows: .\gradlew.bat bootRun
```

Health check: `http://localhost:8082/actuator/health`

Post photo storage uses the MinIO defaults in `application.properties`; start MinIO with
`docker compose up -d minio minio-init` when working on post photo uploads locally.

---

### Backend — Recommendation Service

```bash
cd backend/recommendation-service
./gradlew bootRun    # Windows: .\gradlew.bat bootRun
```

Health check: `http://localhost:8083/actuator/health`

---

### GenAI Service

```bash
cd genai-service
pip install -r requirements.txt
python main.py
```

Health check: `http://localhost:8000/health`

---

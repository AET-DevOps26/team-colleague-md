# team-colleague-md - Verita Platform
[![API Docs](https://img.shields.io/badge/API-Documentation-blue)](https://AET-DevOps26.github.io/team-colleague-md/)

Technical documentation for all Verita microservices.

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

---

### Backend — Content Service

Start infrastructure first (see [Backend Infrastructure](#backend-infrastructure-database--object-storage) above), then:

```bash
cd backend/content-service
./gradlew bootRun    # Windows: .\gradlew.bat bootRun
```

Health check: `http://localhost:8082/actuator/health`

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

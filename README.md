# team-colleague-md - Verita Platform
[![API Docs](https://img.shields.io/badge/API-Documentation-blue)](https://AET-DevOps26.github.io/team-colleague-md/)

Technical documentation for all Verita microservices.

## Docker Compose (Recommended)

The fastest way to run the full platform. From the repository root:

```bash
docker compose up --build
```

This builds and starts all five services:

| Service | URL | Description |
|---|---|---|
| `frontend` | http://localhost:3000 | React UI (served by nginx) |
| `user-service` | http://localhost:8081 | Spring Boot — user identity & auth |
| `content-service` | http://localhost:8082 | Spring Boot — posts & content |
| `recommendation-service` | http://localhost:8083 | Spring Boot — feeds & notifications |
| `genai-service` | http://localhost:8000 | FastAPI — AI features |

To stop all services:

```bash
docker compose down
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

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Default dev server: `http://localhost:3000`

---

### Backend — User Service

```bash
cd backend/user-service
./gradlew bootRun    # Windows: .\gradlew.bat bootRun
```

Health check: `http://localhost:8081/actuator/health`

---

### Backend — Content Service

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

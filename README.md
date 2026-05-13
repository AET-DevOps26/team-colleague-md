# team-colleague-md

## Quick Start

This repository contains three main parts:

- `frontend` — Vite + React application (local dev server)
- `backend/user-service` — Spring Boot (Java) service
- `genai-service` — FastAPI (Python) service

### Prerequisites

- Node.js and npm (for frontend)
- Java 21 (for backend)
- Python 3.11+ and `pip` (for genai-service)
- Docker & Docker Compose

---

### Frontend (local)

Install dependencies and start the dev server:

```bash
cd frontend
npm install
npm run dev
```

Default dev server URL:

```text
http://localhost:3000
```

---

### Backend — User Service (local)

Run with the Gradle wrapper:

```bash
cd backend/user-service
./gradlew bootRun    # on Windows use .\gradlew.bat bootRun
```

Service health check:

```text
http://localhost:8081/health
```

---

### GenAI Service (local)

Install dependencies and start the FastAPI app:

```bash
cd genai-service
pip install -r requirements.txt
python main.py
```

Health check:

```text
http://localhost:8000/health
```

---

### Docker Compose

From the repository root you can build and run the services with Docker Compose:

```bash
docker compose up --build
```

This will build and start all three services (as defined in `docker-compose.yml`):

- `frontend` → `http://localhost:3000`
- `user-service` → `http://localhost:8081`
- `genai-service` → `http://localhost:8000`

To start a single service:

```bash
docker compose up --build frontend
```

---

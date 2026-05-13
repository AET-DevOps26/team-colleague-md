# Infrastructure Design

## 1. Overview

Document of Verita's infrastructure goals and the toolchain used to achieve them:
reliable local development, automated quality enforcement, reproducible builds,
and observable cloud-native deployments.

| Goal                        | Tool(s)                              |
|-----------------------------|--------------------------------------|
| Code quality enforcement    | pre-commit                           |
| Containerization            | Docker, Docker Compose               |
| CI — build & test           | GitHub Actions                       |
| CI — API contract           | GitHub Actions + Redocly             |
| CD — deployment             | GitHub Actions + kubectl / Helm      |
| Kubernetes orchestration    | Rancher (local), Azure (cloud)       |
| Metrics & alerting          | Prometheus, Grafana                  |

---

## 2. Repository Structure
```
team-colleague-md/
├── .env.example
├── .pre-commit-config.yaml
├── docker-compose.yml
│
├── .github/
│   └── workflows/
│       ├── ci-user-service.yml
│       ├── ci-content-service.yml
│       ├── ci-recommendation-service.yml
│       ├── ci-genai-service.yml
│       ├── ci-frontend.yml
│       ├── cd-deploy.yml
│       └── openapi-lint.yml
│
├── backend/
│   ├── user-service/
│   │   ├── api/
│   │   │   └── openapi.yaml
│   │   └── Dockerfile
│   ├── content-service/
│   │   ├── api/
│   │   │   └── openapi.yaml
│   │   └── Dockerfile
│   └── recommendation-service/
│       ├── api/
│       │   └── openapi.yaml
│       └── Dockerfile
│
├── frontend/
│   └── Dockerfile
│
├── genai-service/
│   ├── api/
│   │   └── openapi.yaml
│   └── Dockerfile
│
└── infra/
    ├── k8s/
    │   ├── namespace.yaml
    │   ├── user-service/
    │   ├── content-service/
    │   ├── recommendation-service/
    │   ├── genai-service/
    │   └── ingress.yaml
    │
    ├── prometheus/
    │   ├── prometheus.yml
    │   └── alerts.yaml
    │
    └── grafana/
        └── dashboards/
            └── verita-overview.json
```

---

## 3. pre-commit

pre-commit is a framework that runs automated checks on every `git commit`,
catching issues locally before they reach CI.

**Installation:**
```bash
pip install pre-commit
pre-commit install
```

After running `pre-commit install`, hooks trigger automatically on every `git commit`. To manually check all files at any time:
```bash
pre-commit run --all-files
```

**Hooks configured in `.pre-commit-config.yaml`:**

| Hook | Purpose |
|------|---------|
| `trailing-whitespace` | Remove trailing whitespace at end of lines |
| `end-of-file-fixer` | Ensure files end with a single newline |
| `openapi-lint` (Redocly CLI) | Lint all `openapi.yaml` files against OpenAPI 3.0 rules via `npx @redocly/cli lint` |

---

## 4. Docker & Docker Compose

Each service ships with its own `Dockerfile`. `docker-compose.yml` at the repository root
wires all services together for local development.

**Start all services:**
```bash
docker compose up --build
```

**Start a single service:**
```bash
docker compose up --build user-service
```

### 4.1 Service Images

#### `backend/user-service` — Java / Spring Boot

A two-stage build keeps the final image small: the builder stage compiles the fat JAR with
Gradle; the runtime stage copies only the JAR into a lean JRE image.

```
Stage 1 (builder)  eclipse-temurin:21-jdk
  COPY gradle wrapper + build scripts
  RUN  ./gradlew bootJar          → build/libs/*.jar

Stage 2 (runtime)  eclipse-temurin:21-jre
  COPY --from=builder *.jar app.jar
  EXPOSE 8081
  ENTRYPOINT java -jar app.jar
```

#### `genai-service` — Python / FastAPI

Single-stage build. Dependencies are installed first (before copying source) so Docker can
cache the pip layer across code-only changes.

```
FROM python:3.12-slim
RUN  pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD  uvicorn main:app --host 0.0.0.0 --port 8000
```

#### `frontend` — React / Vite

A two-stage build: the builder stage compiles the static assets with Node.js; the runtime
stage serves them with nginx. The final image contains no Node.js or source files.

```
Stage 1 (builder)  node:20-alpine
  RUN  npm ci
  RUN  npm run build        → dist/

Stage 2 (runtime)  nginx:alpine
  COPY --from=builder dist/ /usr/share/nginx/html
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  EXPOSE 80
```

`nginx.conf` uses `try_files $uri $uri/ /index.html` so that React can handle client-side routing.

### 4.2 docker-compose.yml

`docker-compose.yml` lives at the repository root. Each service entry declares its build
context (the directory containing the `Dockerfile`) and the host port mapping.

| Service | Build context | Host → Container port | Profile |
|---------|--------------|----------------------|---------|
| `user-service` | `./backend/user-service` | `8081 → 8081` | `dev` |
| `genai-service` | `./genai-service` | `8000 → 8000` | — |
| `frontend` | `./frontend` | `3000 → 80` | — |


---

## 5. GitHub Actions — Continuous Integration

### 5.1 Per-Service Build & Test

Each service has its own workflow file triggered on pull requests to `dev`. Path filters ensure
a workflow only runs when files in that service change.

| Workflow | Trigger path | Job |
|----------|-------------|-----|
| `ci-user-service.yml` | `backend/user-service/**` | `./gradlew build` (compile + unit tests) |
| `ci-genai-service.yml` | `genai-service/**` | `pip install -r requirements.txt` + import check |
| `ci-frontend.yml` | `frontend/**` | `npm ci` → `npm run lint` → `npm run build` (includes `tsc`) |

All workflows also trigger when their own `.yml` file is modified.

### 5.2 API Contract Linting

`openapi-lint.yml` triggers on pull requests to `dev` when any `openapi.yaml` file changes.
It uses Redocly CLI to lint all OpenAPI specs in the repository:

```bash
find . -name "openapi.yaml" -not -path "*/node_modules/*" | xargs npx @redocly/cli lint {}
```

This matches the local pre-commit hook so developers get the same feedback locally and in CI.

### 5.3 Code Generation Validation

...

---

## 6. GitHub Actions — Continuous Deployment

...

---

## 7. Kubernetes

...

---

## 8. Prometheus & Grafana

...

---

## 9. Contributor Checklist

...
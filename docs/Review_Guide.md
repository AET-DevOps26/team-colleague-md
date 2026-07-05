# Review Guide

A guided walkthrough for reviewing Verita. It assumes the stack is running — either locally
via Docker Compose or on one of the [cloud deployments](../README.md#cloud-deployments).

## 1. Bring the stack up

```bash
cp genai-service/.env.example genai-service/.env   # first time only
docker compose up --build
npm install && npm run seed:local                  # once services are healthy
```

A fresh stack starts empty, so the seed step is what populates the demo content. Full
setup detail is in [Local Development](contributing/Local_Development.md).

To review a live environment instead of a local one, use the URLs in
[Cloud Deployments](../README.md#cloud-deployments) — they are already seeded.

## 2. Log in and explore

Open `http://localhost:3000` and sign in as **`alexchen`** (email `alex@example.com`,
password `Password123!`). This admin account is seeded with content across every feature
area, so it can exercise the whole product.

Walk through the features using the **[Integration Check List](Check_List.md)**, which
tracks manual verification status per feature area (home feed, authentication, posts,
comments, topics, bookmarks, profile, digest, recommendations, search).

Suggested happy path: **log in → open a post → generate an AI summary → view the daily
digest → follow topics → browse the recommendation feed**.

## 3. Health checks

All services run Docker health checks every 30 seconds and expose a status endpoint:

```text
http://localhost:8081/actuator/health   # user-service
http://localhost:8082/actuator/health   # content-service
http://localhost:8083/actuator/health   # recommendation-service
http://localhost:8000/health            # genai-service
```

On the deployed environments the backends are not publicly exposed (the nginx gateway
returns 404 for `/…/actuator`); use the frontend URL to confirm the stack is healthy.

## 4. View monitoring

Verita ships a shared Prometheus + Grafana stack (same Micrometer metric names on every
deployment target). See [`infra/monitoring/README.md`](../infra/monitoring/README.md) for
what is collected.

**Local (Docker Compose):**

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.monitoring.local.yml up -d
# Grafana     http://localhost:3001   (admin / verita_grafana_admin)
# Prometheus  http://localhost:9090
```

**Rancher (Kubernetes):** Grafana is served behind the shared ingress at `/grafana` —
e.g. `https://dev.verita.stud.k8s.aet.cit.tum.de/grafana`. Log in with `admin` /
`verita_grafana_admin` (dev default).

The pre-provisioned **Verita Overview** dashboard covers HTTP RED metrics (request rate,
5xx ratio, latency), JVM, DB connection pools, and PostgreSQL health.

## Where to go next

- **Architecture:** [System Overview & Architecture](architecture/System_Overview_Architecture.md)
- **What problem it solves:** [Problem Statement](product/Problem_Statement.md)
- **How it's deployed:** [Infrastructure Design](infrastructure/Infrastructure_Design.md)
- **Testing strategy:** [Backend Testing](testing/Testing.md) · [Frontend Testing](testing/Frontend_Testing.md)

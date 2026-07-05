# Infrastructure Design

This is the **infrastructure hub** for Verita: it gives an end-to-end overview of how the
platform is built, tested, provisioned, deployed, and observed, and links out to the
specialized docs for the detail. The guiding principle is *overview + cross-link* — this
document does not duplicate the concrete docs it points to.

| Concern | Detail doc |
|---|---|
| API gateway / path-prefix routing | [API Gateway & Routing](API_Gateway_Routing.md) |
| Kubernetes deployment (Helm chart) | [`infra/helm/verita/README.md`](../../infra/helm/verita/README.md) |
| Monitoring (Prometheus + Grafana) | [`infra/monitoring/README.md`](../../infra/monitoring/README.md) |
| Seeding deployed environments | [Seeding Remote Environments](Seeding_Remote_Environments.md) |

## 1. Overview

Verita's infrastructure goals and the toolchain used to achieve them: reliable local
development, automated quality enforcement, reproducible builds, and observable cloud-native
deployments.

| Goal                        | Tool(s)                          |
| --------------------------- | -------------------------------- |
| Code quality enforcement    | pre-commit                       |
| Containerization            | Docker, Docker Compose           |
| CI — build & test           | GitHub Actions                   |
| CI — API contract           | GitHub Actions + Redocly         |
| Infrastructure provisioning | Terraform (Azure)                |
| VM configuration/deployment | Ansible                          |
| CD — IaC                    | GitHub Actions + Terraform       |
| CD — VM deployment          | GitHub Actions + Ansible         |
| CD — K8s deployment         | GitHub Actions + Helm            |
| Kubernetes orchestration    | Rancher (TUM cluster)            |
| API gateway                 | nginx (in the frontend image)    |
| Metrics & alerting          | Prometheus, Grafana              |

Verita runs on **two independent deployment targets** from the same images:

- **Kubernetes (Rancher)** — the primary target, `verita-dev` and `verita-prod` namespaces
  on the TUM Rancher cluster, deployed with the `verita` Helm umbrella chart.
- **Azure VM** — a single Ubuntu VM running `docker-compose.prod.yml`, provisioned with
  Terraform and configured with Ansible.

---

## 2. Repository Structure

```
team-colleague-md/
├── docker-compose.yml                     # local dev stack
├── docker-compose.prod.yml                # Azure VM stack (pre-built ghcr.io images)
├── docker-compose.monitoring.yml          # Prometheus/Grafana overlay
├── docker-compose.monitoring.local.yml    # local-only monitoring overrides
├── .pre-commit-config.yaml
│
├── .github/workflows/
│   ├── ci-user-service.yml                # per-service build & test
│   ├── ci-content-service.yml
│   ├── ci-recommendation-service.yml
│   ├── ci-genai-service.yml
│   ├── ci-frontend.yml
│   ├── openapi-lint.yml                    # OpenAPI contract linting
│   ├── openapi-deploy-docs.yaml            # publish API docs to GitHub Pages
│   ├── docker-publish.yml                  # build & push images to ghcr.io
│   ├── terraform-deploy.yml                # CD — provision Azure (IaC)
│   ├── ansible-deploy.yml                  # CD — deploy to the Azure VM
│   └── helm-deploy.yml                     # CD — deploy to Kubernetes (Rancher)
│
├── backend/{user,content,recommendation}-service/   # Spring Boot + Dockerfile + api/openapi.yaml
├── frontend/                                          # React + Dockerfile (nginx gateway)
├── genai-service/                                     # FastAPI + Dockerfile + api/openapi.yaml
│
└── infra/
    ├── terraform/                          # Azure resource provisioning
    ├── ansible/                            # VM configuration + compose deployment
    ├── helm/verita/                        # Kubernetes umbrella chart (+ subcharts)
    │   ├── files/verita-alerts.yml         # shared Prometheus alert rules
    │   └── dashboards/verita-overview.json # shared Grafana dashboard
    └── monitoring/
        └── azure/                          # Azure-only Prometheus/Grafana config
```

---

## 3. pre-commit

pre-commit runs automated checks on every `git commit`, catching issues locally before they
reach CI.

```bash
pip install pre-commit
pre-commit install          # enable the hooks
pre-commit run --all-files  # run them manually against everything
```

| Hook                         | Purpose                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `trailing-whitespace`        | Remove trailing whitespace at end of lines                                          |
| `end-of-file-fixer`          | Ensure files end with a single newline                                              |
| `openapi-lint` (Redocly CLI) | Lint all `openapi.yaml` files against OpenAPI 3.0 rules via `npx @redocly/cli lint` |

---

## 4. Docker & Docker Compose

Each service ships its own `Dockerfile`; `docker-compose.yml` at the repository root wires
everything together for local development.

```bash
docker compose up --build              # start the whole stack
docker compose up --build user-service # start a single service
```

### 4.1 Service Images

- **`backend/*-service` (Java / Spring Boot)** — two-stage build: the builder stage compiles
  the fat JAR with Gradle on `eclipse-temurin:25-jdk`; the runtime stage copies only the JAR
  into a lean `eclipse-temurin:25-jre` image.
- **`genai-service` (Python / FastAPI)** — single-stage `python:3.12-slim`; dependencies are
  installed before copying source so Docker caches the pip layer across code-only changes.
- **`frontend` (React / Vite)** — two-stage build: `node:20-alpine` compiles the static
  assets, then `nginx:alpine` serves them. `nginx.conf` uses `try_files $uri $uri/ /index.html`
  for client-side routing **and reverse-proxies the API prefixes** (see §9, API Gateway).

### 4.2 docker-compose.yml (local dev)

Builds every service from source plus one PostgreSQL database per service and MinIO object
storage (with a bucket-init sidecar). This is the stack the [root README](../../README.md)
Quick Start uses.

### 4.3 docker-compose.prod.yml (Azure VM)

Used for the Azure VM deployment. Unlike the dev file it references **pre-built images from
`ghcr.io`** instead of building on the fly, keeping VM resource usage low.

Key differences:
- **Images**: `ghcr.io/aet-devops26/team-colleague-md/<service>:latest` (pre-built).
- **Credentials**: injected via an Ansible-written `.env` file (not committed).
- **Health checks**: every service defines a `healthcheck`.
- **Restart policy**: `restart: unless-stopped` for automatic recovery.

Ansible uploads this file to the VM and runs it without `--build`:

```bash
docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

---

## 5. GitHub Actions — Continuous Integration

### 5.1 Per-Service Build & Test

Each service has its own workflow, triggered on pull requests to `dev`. Path filters ensure a
workflow only runs when that service changes (and when its own `.yml` file changes).

| Workflow                        | Trigger path                        | Job                                                            |
| ------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| `ci-user-service.yml`           | `backend/user-service/**`           | `./gradlew build` (compile + unit tests)                       |
| `ci-content-service.yml`        | `backend/content-service/**`        | `./gradlew build` (compile + unit tests)                       |
| `ci-recommendation-service.yml` | `backend/recommendation-service/**` | `./gradlew build` (compile + unit tests)                       |
| `ci-genai-service.yml`          | `genai-service/**`                  | `pip install -r requirements.txt` + import check + `pytest -q` |
| `ci-frontend.yml`               | `frontend/**`                       | `npm ci` → `npm run lint` → `npm run build` (includes `tsc`)   |

See [Backend Testing](../testing/Testing.md) and [Frontend Testing](../testing/Frontend_Testing.md)
for the test strategy behind these jobs.

### 5.2 API Contract Linting

`openapi-lint.yml` triggers on pull requests to `dev` when any `openapi.yaml` changes. It runs
Redocly CLI over every spec — matching the local pre-commit hook, so feedback is identical
locally and in CI:

```bash
find . -name "openapi.yaml" -not -path "*/node_modules/*" | xargs npx @redocly/cli lint {}
```

### 5.3 API Documentation Publishing

`openapi-deploy-docs.yaml` triggers on pushes to `main` when any `openapi.yaml` changes. It
builds static HTML docs for all four API-bearing services with Redocly CLI and deploys them to
GitHub Pages (linked from the README badge).

| Service                  | Source spec                                       |
| ------------------------ | ------------------------------------------------- |
| `user-service`           | `backend/user-service/api/openapi.yaml`           |
| `content-service`        | `backend/content-service/api/openapi.yaml`        |
| `recommendation-service` | `backend/recommendation-service/api/openapi.yaml` |
| `genai-service`          | `genai-service/api/openapi.yaml`                  |

### 5.4 Docker Build and Publish

`docker-publish.yml` triggers on pull requests and pushes to `dev` and `main` when service
source files change. It validates image builds on PRs and publishes on merge.

| Event                           | Action                                                    |
| ------------------------------- | --------------------------------------------------------- |
| Pull request to `dev` or `main` | Build all service images (validate only, no push)         |
| Push to `dev` (merge)           | Build and push all images to `ghcr.io` with `:dev` tag    |
| Push to `main` (merge)          | Build and push all images to `ghcr.io` with `:latest` tag |

Images are published to `ghcr.io/aet-devops26/team-colleague-md/<service>` with an
environment-specific tag (`:latest` for `main`, `:dev` for `dev`, `pr-<N>` for pull requests).
Authentication uses the automatic `GITHUB_TOKEN`; no additional secret is required. This
workflow is the trigger for both CD paths (§7 Ansible/VM and §8 Helm/K8s).

---

## 6. Infrastructure as Code (Azure)

Verita's Azure infrastructure is defined with Terraform (provisioning) and Ansible
(configuration + deployment). A full VM environment can be recreated from scratch with two
commands after a one-time bootstrap.

### 6.1 First-time Setup

Before any CD workflow can run, a human completes these once:

1. **Generate an SSH key pair** (no passphrase — required for unattended CI):
   ```bash
   ssh-keygen -t rsa -b 4096 -f verita_key
   ```
2. **Add GitHub Secrets/Variables** (Settings → Secrets and variables → Actions): see §6.4.
3. **Run `bootstrap.sh`** to create the Terraform state backend and an Azure Service Principal:
   ```bash
   az login
   bash infra/terraform/bootstrap.sh
   ```
4. **Add the four ARM secrets** the script prints (`ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`,
   `ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID`).
5. **After the first `terraform apply`**, set the `AZURE_PUBLIC_IP` Variable to the IP the
   apply prints.

### 6.2 Terraform

Terraform provisions all Azure resources from `infra/terraform/`. State is stored remotely in
an Azure Blob Storage container so the team shares one source of truth.

**Resources provisioned:**

| Resource               | Configuration                                                          |
| ---------------------- | ---------------------------------------------------------------------- |
| Resource Group         | `verita-rg`, **Austria East** (`austriaeast`)                          |
| Virtual Network        | `10.0.0.0/16`                                                          |
| Subnet                 | `10.0.1.0/24`                                                          |
| Network Security Group | Inbound: SSH (22), HTTP (80), app ports 3000 / 8000 / 8081–8083        |
| Public IP              | Static, Standard SKU                                                   |
| Network Interface      | Bound to subnet, NSG, and public IP                                    |
| Virtual Machine        | **`Standard_D2_v2_Promo`** (Gen1 promo SKU), Ubuntu 22.04 LTS, SSH-key auth, 30 GB OS disk |

> **VM migration note.** The VM was rebuilt in-place in the `austriaeast` region on the
> `Standard_D2_v2_Promo` promotional SKU. That size only offers a **Gen1** (`HyperVGeneration V1`)
> image line, so the Ubuntu 22.04 source image is pinned accordingly in `main.tf`.

> **On the public IP.** The public IP uses `allocation_method = "Static"`, so it is stable for
> the life of a *given* VM. It is **not** permanent across rebuilds: destroying and recreating
> the VM (as happened in the region migration) allocates a **new** IP. For that reason the IP is
> never hardcoded in docs — the authoritative value is the `AZURE_PUBLIC_IP` GitHub Variable,
> which the deploy pipeline also consumes. Update that Variable whenever the VM is recreated.

### 6.3 Ansible

Ansible configures the VM and deploys the compose stack from `infra/ansible/`, connecting over
SSH with the key in `AZURE_PRIVATE_KEY`. `deploy.yml` runs three phases:

1. **System preparation** — install Docker Engine + the Compose plugin; add the admin user to
   the `docker` group.
2. **File sync** — copy `docker-compose.prod.yml` to the VM; write a `.env` with the DB
   credentials (sourced from GitHub Secrets).
3. **Service start** — log in to `ghcr.io`, pull the latest images, and
   `docker compose up -d --remove-orphans`.

### 6.4 GitHub Secrets and Variables

| Type     | Key                   | Purpose                                                    |
| -------- | --------------------- | ---------------------------------------------------------- |
| Secret   | `ARM_CLIENT_ID`       | Terraform — Azure Service Principal app ID                 |
| Secret   | `ARM_CLIENT_SECRET`   | Terraform — Service Principal password                     |
| Secret   | `ARM_SUBSCRIPTION_ID` | Terraform — Azure subscription ID                          |
| Secret   | `ARM_TENANT_ID`       | Terraform — Azure AD tenant ID                             |
| Secret   | `VM_SSH_PUBLIC_KEY`   | Terraform — public key written to VM `authorized_keys`     |
| Secret   | `AZURE_PRIVATE_KEY`   | Ansible — private key for SSH access to the VM             |
| Secret   | `DB_PASSWORD`         | Ansible — PostgreSQL password written to `.env` on the VM  |
| Variable | `AZURE_USER`          | Ansible — VM admin username (`azureuser`)                  |
| Variable | `AZURE_PUBLIC_IP`     | Ansible — VM public IP (set after apply; changes on rebuild) |

Kubernetes (Helm) deployment adds its own secrets — see §8.

---

## 7. Continuous Deployment — Azure VM

### 7.1 Terraform Deploy

`terraform-deploy.yml` triggers on changes to `infra/terraform/**`.

| Event                 | Action                                                               |
| --------------------- | -------------------------------------------------------------------- |
| Pull request to `dev` | `terraform plan` — previews changes, output visible in CI logs       |
| Push to `dev` (merge) | `terraform apply -auto-approve` — creates or updates Azure resources |

It also runs `terraform fmt -check` and `terraform validate` on every run, and prints the VM
public IP as a workflow notice after a successful apply.

### 7.2 Ansible Deploy

`ansible-deploy.yml` deploys the latest images to the Azure VM.

| Event                                                        | Action                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| `workflow_dispatch`                                          | Manual trigger from the Actions UI                     |
| `workflow_run` (after "Docker Build and Publish" on `main`)  | Automatic trigger when new `:latest` images are pushed |

It generates `inventory.ini` at runtime from `AZURE_PUBLIC_IP`, writes the SSH key from
`AZURE_PRIVATE_KEY` to a temp file, then runs `ansible-playbook infra/ansible/deploy.yml`.

```
Code merged to main
  → docker-publish.yml  builds and pushes :latest images to ghcr.io
  → ansible-deploy.yml  pulls new images and restarts services on the VM
```

---

## 8. Continuous Deployment — Kubernetes (Helm / Rancher)

The primary deployment target is the **TUM Rancher** Kubernetes cluster, deployed with the
`verita` umbrella Helm chart. Full chart detail — subcharts, values layering, ingress, and
image resolution — lives in [`infra/helm/verita/README.md`](../../infra/helm/verita/README.md);
this is the pipeline overview.

**Environments** (one Helm release per namespace):

| Branch | Namespace     | Values file       | Image tag | cert-manager issuer  |
| ------ | ------------- | ----------------- | --------- | -------------------- |
| `dev`  | `verita-dev`  | `values-dev.yaml`  | `:dev`    | `letsencrypt-staging` |
| `main` | `verita-prod` | `values-prod.yaml` | `:latest` | `letsencrypt-prod`    |

**`helm-deploy.yml`** triggers automatically via `workflow_run` after "Docker Build and Publish"
completes on `main`/`dev` (push events only), and can be run manually with `workflow_dispatch`
(choosing `dev` or `prod`). It:

1. Loads the cluster `KUBECONFIG` secret.
2. Adds the Bitnami repo and runs `helm dependency update` for the PostgreSQL/MinIO subcharts.
3. Runs `helm upgrade --install verita ./infra/helm/verita -f values.yaml -f values-<env>.yaml`
   into `verita-<env>`, stamping a per-service `rolloutId` so pods roll to the new images.

**Secrets.** A **prod** deploy injects real secrets via `--set` (`JWT_SECRET`,
`INTERNAL_SERVICE_TOKEN`, MinIO root/user secret keys, per-service DB passwords). **Dev** keeps
the committed insecure defaults from `values.yaml`, so `verita-dev` stays reproducible without
secret access. (Bitnami honours a DB password only on first init of an empty data dir, so
changing a prod DB password against an existing PVC requires care.)

**Routing.** The Ingress is intentionally trivial — a single rule routing `/` to the frontend;
the frontend's nginx is the API gateway (§9). This keeps the backends off the public Ingress
and avoids rewrite/regex annotations.

---

## 9. API Gateway

Both deployment targets route identically because they share one gateway: **nginx baked into
the frontend image**. The browser only ever talks to the frontend origin; nginx reverse-proxies
the API path prefixes to the in-cluster / in-compose services and serves the SPA for everything
else.

```
Browser → (Ingress / VM :80) → frontend nginx ─┬─ /user/           → user-service:8081
                                                ├─ /content/        → content-service:8082
                                                ├─ /recommendation/ → recommendation-service:8083
                                                ├─ /genai/          → genai-service:8000
                                                ├─ /storage/        → minio:9000
                                                └─ /                → SPA (index.html)
```

Because the same `nginx.conf` runs on the VM and in Kubernetes, the frontend's API clients use
relative base URLs everywhere. Backends are never publicly exposed, and `/…/actuator` and
`/genai/metrics` are returned 404 on the public surface. The full path-prefix contract across
local, Azure, and Kubernetes is in [API Gateway & Routing](API_Gateway_Routing.md).

---

## 10. Monitoring — Prometheus & Grafana

Verita ships a shared Prometheus + Grafana stack. Application instrumentation is **identical on
both deployment targets** (same Micrometer metric names), so the **alert rules and Grafana
dashboard are shared** — only service discovery and infra-level exporters differ. Full detail is
in [`infra/monitoring/README.md`](../../infra/monitoring/README.md).

**What is collected:** HTTP RED metrics (request rate, 5xx ratio, p95/p99 latency) from Spring
Micrometer `/actuator/prometheus` and genai `/metrics`; JVM and HikariCP pool metrics;
PostgreSQL via `postgres_exporter`. Host (node-exporter) and container (cAdvisor) metrics are
**Azure-only** — the shared TUM namespace lacks the cluster-admin access those require.

**Rancher (Helm):** monitoring lives inside the umbrella chart, gated by `monitoring.enabled`
(default `true`), with no Prometheus Operator/CRDs and no cluster-scoped RBAC. Prometheus
discovers targets via `prometheus.io/*` annotations restricted to the release namespace. Grafana
is served behind the shared ingress at **`/grafana`** (e.g.
`https://dev.verita.stud.k8s.aet.cit.tum.de/grafana`).

**Azure (Compose):** `docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d`
adds Prometheus, Grafana, node-exporter, cAdvisor and per-DB exporters, all bound to `127.0.0.1`
and reached over an SSH tunnel.

**Local:** `docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.monitoring.local.yml up -d`
(Grafana `http://localhost:3001`, Prometheus `http://localhost:9090`).

The shared assets live in the chart (`infra/helm/verita/files/verita-alerts.yml`,
`infra/helm/verita/dashboards/verita-overview.json`) and the compose stack mounts the same
paths, keeping a single source of truth.

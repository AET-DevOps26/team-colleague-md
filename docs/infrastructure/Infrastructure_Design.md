# Infrastructure Design

The hub for Verita's infrastructure: what environments exist, how they are provisioned,
and how code gets from a merged PR into each of them. Each section gives an overview and
links to the specialized doc (or config) that is the source of truth for details.

| Specialized doc | Covers |
|---|---|
| [API Gateway & Routing](API_Gateway_Routing.md) | Path-prefix routing in every environment |
| [`infra/monitoring/README.md`](../../infra/monitoring/README.md) | Prometheus + Grafana: what is collected, per-environment setup |
| [`infra/helm/verita/README.md`](../../infra/helm/verita/README.md) | The Kubernetes umbrella chart in detail |
| [Seeding Remote Environments](Seeding_Remote_Environments.md) | Populating verita-dev and the Azure VM with demo data |
| [Testing Strategy](../testing/Testing.md) | What the CI workflows actually run per service |

## 1. Environments at a Glance

| Environment | Platform | Entry point | Deployed by |
|---|---|---|---|
| Local dev | Docker Compose (built locally) | `http://localhost:3000` | `docker compose up --build` |
| Azure VM | Docker Compose on one Ubuntu VM | `http://<AZURE_PUBLIC_IP>/` | `terraform-deploy` + `ansible-deploy` |
| verita-dev | TUM Rancher Kubernetes | https://dev.verita.stud.k8s.aet.cit.tum.de/ | `helm-deploy` (push to `dev`) |
| verita-prod | TUM Rancher Kubernetes | https://verita.stud.k8s.aet.cit.tum.de/ | `helm-deploy` (push to `main`) |

The Azure VM's public IP is stored in the `AZURE_PUBLIC_IP` GitHub Actions variable and
printed by the Terraform workflow after each apply (see [section 7.2](#72-terraform)).

## 2. Goals and Toolchain

| Goal | Tool(s) |
| --- | --- |
| Code quality enforcement | pre-commit |
| Containerization | Docker, Docker Compose |
| CI — build & test | GitHub Actions |
| CI — API contract | GitHub Actions + Redocly |
| Infrastructure provisioning | Terraform (Azure) |
| VM configuration & deployment | Ansible |
| CD — IaC | GitHub Actions + Terraform |
| CD — VM deployment | GitHub Actions + Ansible |
| CD — K8s deployment | GitHub Actions + Helm |
| Kubernetes | TUM Rancher cluster (`verita-dev` / `verita-prod` namespaces) |
| Metrics & alerting | Prometheus, Grafana |

## 3. Repository Structure (infrastructure view)

```
team-colleague-md/
├── .pre-commit-config.yaml
├── docker-compose.yml                    # local dev stack (builds images)
├── docker-compose.prod.yml               # Azure VM stack (pre-built ghcr.io images)
├── docker-compose.monitoring.yml         # Prometheus + Grafana overlay (VM & local)
├── docker-compose.monitoring.local.yml   # local-only monitoring overrides
│
├── .github/workflows/
│   ├── ci-user-service.yml               # CI per service …
│   ├── ci-content-service.yml
│   ├── ci-recommendation-service.yml
│   ├── ci-genai-service.yml
│   ├── ci-frontend.yml
│   ├── openapi-lint.yml                  # API contract linting
│   ├── openapi-deploy-docs.yaml          # API docs → GitHub Pages
│   ├── docker-publish.yml                # image build & push to ghcr.io
│   ├── terraform-deploy.yml              # CD — Azure infrastructure
│   ├── ansible-deploy.yml                # CD — Azure VM app deployment
│   └── helm-deploy.yml                   # CD — Kubernetes deployment
│
├── backend/
│   ├── user-service/                     # Dockerfile + api/openapi.yaml each
│   ├── content-service/
│   └── recommendation-service/
├── frontend/                             # Dockerfile + nginx.conf (the API gateway)
├── genai-service/                        # Dockerfile + api/openapi.yaml
│
└── infra/
    ├── terraform/                        # bootstrap.sh, providers/variables/main/outputs.tf
    ├── ansible/                          # deploy.yml, inventory.ini, group_vars/all.yml
    ├── helm/verita/                      # umbrella chart: values*.yaml, templates/, dashboards/, files/
    └── monitoring/                       # README + Azure-only Prometheus/Grafana config
```

## 4. pre-commit

pre-commit runs automated checks on every `git commit`, catching issues locally before
they reach CI.

```bash
pip install pre-commit
pre-commit install          # hooks now run on every commit
pre-commit run --all-files  # manual full check
```

**Hooks configured in `.pre-commit-config.yaml`:**

| Hook | Purpose |
| --- | --- |
| `trailing-whitespace` | Remove trailing whitespace at end of lines |
| `end-of-file-fixer` | Ensure files end with a single newline |
| `openapi-lint` (Redocly CLI) | Lint all `openapi.yaml` files via `npx @redocly/cli lint` |

## 5. Docker & Docker Compose

Each service ships its own `Dockerfile`; two compose files wire them together —
`docker-compose.yml` builds from source for local development, `docker-compose.prod.yml`
runs pre-built images on the Azure VM.

### 5.1 Service Images

**Spring services** (`backend/*-service`) — two-stage build: the builder stage compiles the
fat JAR with Gradle, the runtime stage copies only the JAR into a lean JRE image.

```
Stage 1 (builder)  eclipse-temurin:25-jdk   ./gradlew bootJar → build/libs/*.jar
Stage 2 (runtime)  eclipse-temurin:25-jre   java -jar app.jar   (EXPOSE 8081/8082/8083)
```

**genai-service** — single-stage `python:3.12-slim`; dependencies are installed before the
source is copied so the pip layer is cached across code-only changes.

```
FROM python:3.12-slim → pip install -r requirements.txt → COPY . .
CMD uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**frontend** — two-stage: `node:20-alpine` builds the static assets, `nginx:alpine` serves
them. `nginx.conf` is templated at container start (envsubst) with the backend URLs and
doubles as the platform's API gateway (see [section 10](#10-api-gateway)).

### 5.2 docker-compose.yml (local dev)

Builds all images locally and runs the full platform with dev-profile defaults (shared
dev `JWT_SECRET` / `INTERNAL_SERVICE_TOKEN`, committed dev DB credentials):

| Service | Host port | Notes |
| --- | --- | --- |
| `frontend` | 3000 → 80 | nginx serving the built SPA + gateway |
| `user-service` | 8081 | Spring `dev` profile |
| `content-service` | 8082 | Spring `dev` profile |
| `recommendation-service` | 8083 | Spring `dev` profile |
| `genai-service` | 8000 | reads `genai-service/.env` |
| `user-db` / `content-db` / `recommendation-db` | 5432 / 5433 / 5434 | PostgreSQL 16, one per service |
| `minio` | 9000 (API), 9001 (console) | object storage |
| `minio-init` | — | one-shot: creates buckets + scoped per-service S3 users |
| `mailpit` | 8025 (UI), 1025 (SMTP) | local mail sink for the password-reset flow |

All services define Docker health checks (Actuator/`/health` polls every 30 s), and the
app services wait for their database (and `minio-init`) before starting.

### 5.3 docker-compose.prod.yml (Azure VM)

Same topology, production wiring: pre-built `ghcr.io/aet-devops26/team-colleague-md/<service>:latest`
images instead of local builds (keeps VM resource usage low), all three PostgreSQL
databases, MinIO with the same scoped-user init, `restart: unless-stopped`, and health
checks on every service.

Key differences from the dev file:

- **Only the frontend is published** (port 80). Databases, backends, and MinIO stay on the
  internal Docker network; the MinIO console is bound to `127.0.0.1` for SSH-tunnel access.
- **Secrets come from a `.env` file** written by Ansible next to the compose file
  (DB passwords, `JWT_SECRET`, `INTERNAL_SERVICE_TOKEN`, MinIO root + per-service S3
  credentials, Brevo SMTP credentials). Non-secret names/users carry committed defaults.
- **No Mailpit** — password-reset mail goes out via Brevo SMTP.

```bash
# what Ansible runs on the VM (see section 7.3):
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml down -v --remove-orphans
docker compose -f docker-compose.prod.yml up -d
```

## 6. GitHub Actions — Continuous Integration

### 6.1 Per-Service Build & Test

Each service has its own workflow triggered on pull requests to `dev`. Path filters ensure
a workflow only runs when files in that service (or the workflow file itself) change.

| Workflow | Trigger path | Job |
| --- | --- | --- |
| `ci-user-service.yml` | `backend/user-service/**` | JDK 25 · `./gradlew build` (compile, tests, JaCoCo coverage gate) |
| `ci-content-service.yml` | `backend/content-service/**` | JDK 25 · `./gradlew build` (compile, tests, JaCoCo coverage gate) |
| `ci-recommendation-service.yml` | `backend/recommendation-service/**` | JDK 25 · `./gradlew build` (compile, tests, JaCoCo coverage gate) |
| `ci-genai-service.yml` | `genai-service/**` | Python 3.12 · install deps, import check, `pytest` (70 % line-coverage gate) |
| `ci-frontend.yml` | `frontend/**` | Node 24 · `npm ci` → `npm run lint` → `npm run build` (includes `tsc`) |

Coverage gates and test structure are documented in the
[Testing Strategy](../testing/Testing.md).

### 6.2 API Contract Linting

`openapi-lint.yml` triggers on pull requests to `dev` when any `openapi.yaml` changes and
lints every spec in the repository with Redocly CLI — the same check as the local
pre-commit hook, so developers get identical feedback locally and in CI.

### 6.3 API Documentation Publishing

`openapi-deploy-docs.yaml` triggers on pushes to `main` that touch any `openapi.yaml` or
the landing page (`index.html`). It builds static HTML docs for all four service specs
with Redocly CLI and deploys them to GitHub Pages:
<https://AET-DevOps26.github.io/team-colleague-md/>.

| Service | Source spec |
| --- | --- |
| `user-service` | `backend/user-service/api/openapi.yaml` |
| `content-service` | `backend/content-service/api/openapi.yaml` |
| `recommendation-service` | `backend/recommendation-service/api/openapi.yaml` |
| `genai-service` | `genai-service/api/openapi.yaml` |

### 6.4 Docker Build and Publish

`docker-publish.yml` triggers on pull requests and pushes to `dev` and `main` when service
sources change. It builds all five images (matrix: user, content, recommendation, genai,
frontend) and pushes only on merge:

| Event | Action |
| --- | --- |
| Pull request to `dev` or `main` | Build all images (validation only, nothing pushed) |
| Push to `dev` (merge) | Build and push all images with the `:dev` tag |
| Push to `main` (merge) | Build and push all images with the `:latest` tag |

Images live at `ghcr.io/aet-devops26/team-colleague-md/<service-name>`. Authentication
uses the automatic `GITHUB_TOKEN`; no extra secret is required.

## 7. Infrastructure as Code (Azure VM)

The Azure environment is fully defined in code: Terraform provisions the infrastructure,
Ansible configures the VM and deploys the app. A complete rebuild needs only the one-time
bootstrap plus the two CD workflows.

### 7.1 First-time Setup

Before the CD workflows can run, a human completes these steps once:

1. **Generate an SSH key pair** (no passphrase — required for unattended CI use):
   `ssh-keygen -t rsa -b 4096 -f verita_key`
2. **Run the bootstrap** (`az login`, then `bash infra/terraform/bootstrap.sh`). It creates
   the Terraform state backend — resource group `verita-tfstate-rg` with storage account
   `veritaterraformarpad` (blob container `tfstate`, region `francecentral`) — and a
   `verita-terraform-arpad` Service Principal with the Contributor role, then prints the
   four `ARM_*` values.
3. **Add the GitHub Secrets and Variables** listed in [section 12](#12-github-secrets-and-variables)
   (the `ARM_*` output, the SSH key pair, and the application secrets).
4. **After the first `terraform apply`**, set the `AZURE_PUBLIC_IP` variable to the IP the
   workflow prints.

### 7.2 Terraform

`infra/terraform/` provisions all Azure resources (provider `azurerm ~> 3.0`); state is
stored remotely in the bootstrap-created Azure Blob container so the team shares one
source of truth.

**Resources provisioned:**

| Resource | Configuration |
| --- | --- |
| Resource Group | `verita-rg`, region `austriaeast` |
| Virtual Network / Subnet | `10.0.0.0/16` / `10.0.1.0/24` |
| Network Security Group | Inbound: SSH (22), HTTP (80), app ports 3000 / 8000 / 8081–8083 |
| Public IP | Static, Standard SKU |
| Network Interface | Bound to subnet, NSG, and public IP |
| Virtual Machine | `Standard_D2_v2_Promo`, Ubuntu 22.04 LTS, SSH-key-only auth, 30 GB Standard_LRS OS disk |

Notes:

- The VM size is a **Gen1 promo SKU** — `Standard_D2_v2_Promo` in `austriaeast` only
  supports Hyper-V generation V1, which is why the image is the Gen1 `22_04-lts` SKU.
- Only ports 22 and 80 are actually served by the prod stack (the frontend gateway);
  the extra NSG app-port rules are open but nothing listens on them publicly.
- The public IP is **static for the lifetime of the deployment**: it survives VM restarts,
  but destroying and recreating the infrastructure (as happens on a subscription move or
  full rebuild) allocates a new IP. After any rebuild, update the `AZURE_PUBLIC_IP`
  GitHub variable to the value printed by `terraform apply` — that variable is the
  authoritative address, which is why no IP is hardcoded in the docs.

### 7.3 Ansible

`infra/ansible/deploy.yml` configures the VM and deploys all services over SSH (key from
the `AZURE_PRIVATE_KEY` secret), in three phases:

1. **System preparation** — install Docker Engine + the Compose plugin, add `azureuser`
   to the `docker` group.
2. **File sync** — copy `docker-compose.prod.yml` to `/home/azureuser/verita/` and write
   the `.env` file with the secrets and VM-specific values (three DB passwords,
   `JWT_SECRET`, `INTERNAL_SERVICE_TOKEN`, MinIO root password, per-service S3 key pairs,
   Brevo `MAIL_*` credentials, plus `CORS_ALLOWED_ORIGINS` and
   `STORAGE_S3_PUBLIC_ENDPOINT`, which default to the VM's address).
3. **Service start** — log in to `ghcr.io`, pull the latest images, tear the old stack
   down, and `docker compose up -d`.

> **The teardown uses `down -v`** — named volumes (databases, MinIO) are wiped on every
> deploy for a clean, reproducible demo state. Re-populate afterwards with the seed
> (`VM_HOST=<ip> ./scripts/seed-vm.sh`, see
> [Seeding Remote Environments](Seeding_Remote_Environments.md)).

## 8. GitHub Actions — Continuous Deployment

### 8.1 Terraform Deploy

`terraform-deploy.yml` triggers on changes to `infra/terraform/**`:

| Event | Action |
| --- | --- |
| Pull request to `dev` | `terraform plan` — preview visible in the CI logs |
| Push to `dev` (merge) | `terraform apply -auto-approve` — creates/updates Azure resources |

Every run also executes `terraform fmt -check` and `terraform validate`. After a
successful apply, the VM public IP is printed as a workflow notice (update the
`AZURE_PUBLIC_IP` variable if it changed).

### 8.2 Ansible Deploy (Azure VM)

`ansible-deploy.yml` deploys the latest images to the VM:

| Event | Action |
| --- | --- |
| `workflow_dispatch` | Manual trigger from the Actions UI |
| `workflow_run` after "Docker Build and Publish" on `main` | Automatic deploy when new `:latest` images exist (push events only, not PR builds) |

The job generates `inventory.ini` at runtime from the `AZURE_PUBLIC_IP` / `AZURE_USER`
variables, writes the SSH key from `AZURE_PRIVATE_KEY`, and runs the playbook with the
application secrets passed as `--extra-vars`.

### 8.3 Helm Deploy (Kubernetes)

`helm-deploy.yml` deploys to the Rancher cluster:

| Event | Target |
| --- | --- |
| `workflow_run` after "Docker Build and Publish" on `dev` | `verita-dev` namespace (`:dev` images) |
| `workflow_run` after "Docker Build and Publish" on `main` | `verita-prod` namespace (`:latest` images) |
| `workflow_dispatch` (choice: dev / prod) | Either environment, from the matching branch |

The job authenticates with the `KUBECONFIG` secret and runs `helm upgrade --install` with
`values.yaml` + the environment override file. Two deliberate behaviors:

- **Dev deploys use the committed (insecure) dev defaults** so verita-dev stays
  reproducible without secret access; **real secrets are injected for prod only** via
  `--set` (JWT, internal token, DB passwords, MinIO root + S3 secret keys, mail).
- A per-service `rolloutId` is set from the workflow-run id so every deploy rolls the
  pods even when the image tag (`:dev` / `:latest`) is unchanged.

**End-to-end flow:**

```
merge to dev   → docker-publish (:dev)     → helm-deploy → verita-dev
merge to main  → docker-publish (:latest)  → helm-deploy → verita-prod
                                           → ansible-deploy → Azure VM
```

## 9. Kubernetes — Helm / Rancher

The K8s deployment is a single umbrella chart, [`infra/helm/verita/`](../../infra/helm/verita/README.md):

- **Application services** (user, content, recommendation, genai, frontend) are declared
  in `values.yaml` and rendered from one set of range-based templates (deployment,
  service, ingress).
- **Stateful dependencies** are subcharts: Bitnami PostgreSQL aliased per service
  (`user-postgresql`, `content-postgresql`, `recommendation-postgresql`) and the official
  MinIO chart, whose post-install job provisions the buckets and scoped per-service S3
  users — mirroring the Compose setup.
- **Ingress** is a single rule routing `/` to the frontend (plus `/grafana` to Grafana);
  TLS certificates come from cert-manager (`letsencrypt-staging` on dev,
  `letsencrypt-prod` on prod). The frontend nginx does the API routing — see
  [section 10](#10-api-gateway).
- **Environments**: one release per namespace — `verita-dev`
  (`dev.verita.stud.k8s.aet.cit.tum.de`, `:dev` tags) and `verita-prod`
  (`verita.stud.k8s.aet.cit.tum.de`, `:latest` tags).
- **Namespace constraints**: the shared TUM namespace enforces a ResourceQuota (every
  container must declare limits) and grants no cluster-scoped RBAC — which shapes the
  monitoring setup (see below) and the chart's explicit `resources` blocks.
- **GenAI Service**: both Helm and Ansible default to the TUM Logos provider
  (`LLM_PROVIDER=logos`, `LLM_MODEL=openai/gpt-oss-120b`) and inject the provider keys from
  GitHub Actions Secrets; the Logos endpoint itself is fixed in the application rather than
  in deployment configuration. The chart pins `replicaCount: 1` because digest-job state is
  process-local — job creation and status polling must land on the same process, so scaling
  out requires moving that state to a shared store. Ollama, the local-inference option, is a
  host-native process that neither Compose nor Helm deploys (see
  [ADR-0021](../adr/0021-host-native-ollama-for-local-inference.md)).

Chart layout, install/upgrade commands, and troubleshooting:
[`infra/helm/verita/README.md`](../../infra/helm/verita/README.md).

## 10. API Gateway

Verita uses **path-prefix routing** with the same prefixes everywhere: `/user`,
`/content`, `/recommendation`, `/genai`, `/storage`; the prefix is stripped before
forwarding. The frontend container's nginx is the gateway in both deployed environments
(the K8s Ingress simply forwards everything to it); the Vite dev server plays that role
locally. Backends are never exposed publicly, and the gateway returns 404 for
actuator/metrics paths.

Full walkthrough per environment: [API Gateway & Routing](API_Gateway_Routing.md).

## 11. Monitoring

Prometheus + Grafana run in every deployed environment with **shared alert rules and a
shared dashboard** (owned by the Helm chart; the Compose stack mounts the same files):

- **Collected everywhere**: HTTP RED metrics (Micrometer `/actuator/prometheus`, genai
  `/metrics`), JVM and HikariCP pool metrics, PostgreSQL via `postgres_exporter`.
- **Azure VM only**: host (node-exporter) and container (cAdvisor) metrics; the stack is
  added with `docker-compose.monitoring.yml` and reached over an SSH tunnel.
- **Rancher**: namespace-scoped Prometheus + Grafana inside the chart (no operator, no
  cluster RBAC); Grafana is served through the shared ingress at `/grafana`.
- **Local**: same overlay plus `docker-compose.monitoring.local.yml`
  (Grafana on `http://localhost:3001`, `admin / verita_grafana_admin`).

Details and troubleshooting: [`infra/monitoring/README.md`](../../infra/monitoring/README.md).

## 12. GitHub Secrets and Variables

| Type | Key | Used by |
| --- | --- | --- |
| Secret | `ARM_CLIENT_ID` / `ARM_CLIENT_SECRET` / `ARM_SUBSCRIPTION_ID` / `ARM_TENANT_ID` | Terraform — Azure Service Principal |
| Secret | `VM_SSH_PUBLIC_KEY` | Terraform — public key written to the VM's `authorized_keys` |
| Secret | `AZURE_PRIVATE_KEY` | Ansible — SSH access to the VM |
| Secret | `USER_DB_PASSWORD` / `CONTENT_DB_PASSWORD` / `RECOMMENDATION_DB_PASSWORD` | Ansible (VM `.env`) + Helm prod |
| Secret | `JWT_SECRET` | Ansible + Helm prod — shared HS256 signing secret |
| Secret | `INTERNAL_SERVICE_TOKEN` | Ansible + Helm prod — service-to-service auth (ADR-0007) |
| Secret | `MINIO_ROOT_PASSWORD` | Ansible + Helm prod — MinIO root credentials |
| Secret | `USER_SERVICE_S3_ACCESS_KEY` / `USER_SERVICE_S3_SECRET_KEY` | Ansible; Helm prod overrides the secret key |
| Secret | `CONTENT_SERVICE_S3_ACCESS_KEY` / `CONTENT_SERVICE_S3_SECRET_KEY` | Ansible; Helm prod overrides the secret key |
| Secret | `MAIL_USERNAME` / `MAIL_PASSWORD` / `MAIL_FROM` | Ansible + Helm prod — Brevo SMTP (password-reset mail) |
| Secret | `NVIDIA_NIM_API_KEY` / `LOGOS_API_KEY` / `GNEWS_API_KEY` | Ansible + Helm — GenAI Service LLM providers and digest sources |
| Secret | `KUBECONFIG` | Helm deploy — Rancher cluster access |
| Variable | `AZURE_USER` | Ansible — VM admin username (`azureuser`) |
| Variable | `AZURE_PUBLIC_IP` | Ansible + docs — VM public IP (set after `terraform apply`) |

(`GITHUB_TOKEN` is provided automatically for pushing images to `ghcr.io`.)

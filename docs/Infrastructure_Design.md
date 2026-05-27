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
| Infrastructure provisioning | Terraform                            |
| Application deployment      | Ansible                              |
| CD — IaC                    | GitHub Actions + Terraform           |
| CD — VM deployment          | GitHub Actions + Ansible             |
| CD — K8s deployment         | GitHub Actions + kubectl / Helm      |
| Kubernetes orchestration    | Rancher (local), Azure (cloud)       |
| Metrics & alerting          | Prometheus, Grafana                  |

---

## 2. Repository Structure
```
team-colleague-md/
├── .env.example
├── .pre-commit-config.yaml
├── docker-compose.yml
├── docker-compose.prod.yml
│
├── .github/
│   └── workflows/
│       ├── ci-user-service.yml
│       ├── ci-content-service.yml
│       ├── ci-recommendation-service.yml
│       ├── ci-genai-service.yml
│       ├── ci-frontend.yml
│       ├── docker-build.yml
│       ├── terraform-deploy.yml
│       ├── ansible-deploy.yml
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
    ├── terraform/
    │   ├── bootstrap.sh
    │   ├── providers.tf
    │   ├── variables.tf
    │   ├── main.tf
    │   └── outputs.tf
    │
    ├── ansible/
    │   ├── deploy.yml
    │   ├── inventory.ini
    │   └── group_vars/
    │       └── all.yml
    │
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
Stage 1 (builder)  eclipse-temurin:25-jdk
  COPY gradle wrapper + build scripts
  RUN  ./gradlew bootJar          → build/libs/*.jar

Stage 2 (runtime)  eclipse-temurin:25-jre
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

### 5.4 Docker Build and Publish

`docker-build.yml` triggers on pull requests and pushes to `dev` when service source files change.
It replaces the earlier `ci-docker.yml` and adds image publishing on merge.

| Event | Action |
|-------|--------|
| Pull request to `dev` | Build all service images (validate only, no push) |
| Push to `dev` (merge) | Build and push all images to `ghcr.io` |

Images are published to `ghcr.io/aet-devops26/team-colleague-md/<service-name>:latest`.
Authentication uses the automatic `GITHUB_TOKEN`; no additional secret is required.

| Service | Build context |
|---------|--------------|
| `user-service` | `./backend/user-service` |
| `content-service` | `./backend/content-service` |
| `recommendation-service` | `./backend/recommendation-service` |
| `genai-service` | `./genai-service` |
| `frontend` | `./frontend` |

---

## 6. Infrastructure as Code

Verita's Azure infrastructure is defined in code using Terraform and Ansible. This makes
the environment reproducible: a full deployment can be recreated from scratch with two
commands after completing the one-time bootstrap.

### 6.1 First-time Setup

Before any CI workflow can run, a human must complete these steps once:

**1. Generate an SSH key pair** (no passphrase — required for unattended CI use):
```bash
ssh-keygen -t rsa -b 4096 -f verita_key
```

**2. Add GitHub Secrets and Variables** — Settings → Secrets and variables → Actions:

| Type | Key | Value |
|------|-----|-------|
| Secret | `AZURE_PRIVATE_KEY` | Contents of `verita_key` |
| Secret | `VM_SSH_PUBLIC_KEY` | Contents of `verita_key.pub` |
| Variable | `AZURE_USER` | `azureuser` |

**3. Run `bootstrap.sh`** to create the Terraform state backend and Service Principal:
```bash
az login
bash infra/terraform/bootstrap.sh
```

**4. Add the four ARM secrets** printed by the script to GitHub Secrets:
`ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`, `ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID`

**5. After the first `terraform apply`**, set one more Variable:

| Type | Key | Value |
|------|-----|-------|
| Variable | `AZURE_PUBLIC_IP` | IP printed by `terraform-deploy.yml` after apply |

This value does not change for the lifetime of the VM.

---

### 6.2 Terraform

Terraform provisions all Azure resources from `infra/terraform/`. State is stored remotely
in an Azure Blob Storage container so the team shares a single source of truth.

**One-time bootstrap** (run before the first `terraform apply`):

```bash
az login
bash infra/terraform/bootstrap.sh
```

The script creates the storage account for state and a Service Principal, then prints the
four values that must be added as GitHub Secrets (`ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`,
`ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID`).

**Resources provisioned:**

| Resource | Configuration |
|----------|--------------|
| Resource Group | `verita-rg`, Sweden Central |
| Virtual Network | `10.0.0.0/16` |
| Subnet | `10.0.1.0/24` |
| Network Security Group | Inbound: SSH (22), HTTP (80), app ports 3000 / 8000 / 8081–8083 |
| Public IP | Static, Standard SKU |
| Network Interface | Bound to subnet, NSG, and public IP |
| Virtual Machine | `Standard_D2s_v3`, Ubuntu 22.04 LTS, SSH key auth, 30 GB OS disk |

After the first `terraform apply`, copy the printed `vm_public_ip` value to the
`AZURE_PUBLIC_IP` GitHub Variable. This value does not change for the lifetime of the VM.

### 6.3 Ansible

Ansible configures the VM and deploys all services from `infra/ansible/`. It connects over
SSH using the key stored in the `AZURE_PRIVATE_KEY` GitHub Secret.

**`deploy.yml` — three phases:**

1. **System preparation** — install Docker Engine and the Compose plugin; add `azureuser` to the `docker` group.
2. **File sync** — copy `docker-compose.prod.yml` to `/home/azureuser/verita/` on the VM.
3. **Service start** — log in to `ghcr.io`, pull the latest images, run `docker compose up -d --remove-orphans`.

`docker-compose.prod.yml` references pre-built images from `ghcr.io` instead of building
on the VM, keeping the VM's resource usage low.

### 6.4 GitHub Secrets and Variables

| Type | Key | Purpose |
|------|-----|---------|
| Secret | `ARM_CLIENT_ID` | Terraform — Azure Service Principal app ID |
| Secret | `ARM_CLIENT_SECRET` | Terraform — Service Principal password |
| Secret | `ARM_SUBSCRIPTION_ID` | Terraform — Azure subscription ID |
| Secret | `ARM_TENANT_ID` | Terraform — Azure AD tenant ID |
| Secret | `VM_SSH_PUBLIC_KEY` | Terraform — public key written to VM `authorized_keys` |
| Secret | `AZURE_PRIVATE_KEY` | Ansible — private key for SSH access to the VM |
| Variable | `AZURE_USER` | Ansible — VM admin username (`azureuser`) |
| Variable | `AZURE_PUBLIC_IP` | Ansible — VM public IP (set after first `terraform apply`) |

---

## 7. GitHub Actions — Continuous Deployment

### 7.1 Terraform Deploy

`terraform-deploy.yml` triggers on changes to `infra/terraform/**`.

| Event | Action |
|-------|--------|
| Pull request to `dev` | `terraform plan` — previews changes, output visible in CI logs |
| Push to `dev` (merge) | `terraform apply -auto-approve` — creates or updates Azure resources |

The workflow also runs `terraform fmt -check` and `terraform validate` on every run.
After a successful apply, the VM public IP is printed as a workflow notice.

### 7.2 Ansible Deploy

`ansible-deploy.yml` deploys the latest images to the Azure VM.

| Event | Action |
|-------|--------|
| `workflow_dispatch` | Manual trigger from the GitHub Actions UI |
| `workflow_run` (after `docker-build.yml` on `dev`) | Automatic trigger when new images are pushed |

The workflow generates `inventory.ini` at runtime from the `AZURE_PUBLIC_IP` variable,
writes the SSH key from `AZURE_PRIVATE_KEY` to a temporary file, then runs
`ansible-playbook infra/ansible/deploy.yml`.

**End-to-end deployment flow:**

```
Code merged to dev
  → docker-build.yml   builds and pushes images to ghcr.io
  → ansible-deploy.yml pulls new images and restarts services on the VM
```

---

## 8. Kubernetes

...

---

## 9. Prometheus & Grafana

...

---

## 10. Contributor Checklist

...

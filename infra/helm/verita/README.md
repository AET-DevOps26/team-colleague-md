# Verita Helm Chart

Umbrella Helm chart for the Verita platform. All five services are defined in `values.yaml` and rendered from a single set of templates — no per-service subcharts.

External dependencies: Bitnami `postgresql` (aliased per-service for user, content, and recommendation).

Namespace: `team-md`

## Requirements

- Helm 3.x (install locally)
- Kubernetes cluster with an Ingress controller — provided by the TUM Rancher cluster
- `cert-manager` with a `ClusterIssuer` named `letsencrypt-staging` — pre-installed by cluster admins, no action needed

## Key Files

| File | Purpose |
|------|---------|
| `Chart.yaml` | Chart metadata and postgresql dependencies |
| `values.yaml` | Base values — all services, resources, ingress |
| `values-dev.yaml` | Dev overrides (image tags → `dev`, dev host) |
| `values-prod.yaml` | Prod overrides (host only; tags default to `latest`) |
| `templates/deployment.yaml` | Single template, loops over all services |
| `templates/service.yaml` | Single template, loops over all services |
| `templates/ingress.yaml` | Single Ingress routing all paths |

## Images and Registry

Registry prefix is set under `global.registry` in `values.yaml`:

```
ghcr.io/aet-devops26/team-colleague-md
```

Each service's resolved image:

```
<global.registry>/<services.<name>.image>:<services.<name>.tag>
```

Image pull credentials are configured via `global.imagePullSecrets`. The secret must be created in the namespace before deploying (see Install section).

## Ingress Routing

A single Ingress is created for `ingress.host`. Path routing:

| Path | Service |
|------|---------|
| `/user` | user-service (8081) |
| `/content` | content-service (8082) |
| `/recommendation` | recommendation-service (8083) |
| `/genai` | genai-service (8000) |
| `/summarization` | genai-service (8000) |
| `/` | frontend (80) |

## Service Ports and Resources

Configured in `values.yaml` under `services.<name>`:

| Service | Port | Memory limit |
|---------|------|-------------|
| user | 8081 | 512Mi |
| content | 8082 | 512Mi |
| recommendation | 8083 | 512Mi |
| genai | 8000 | 256Mi |
| frontend | 80 | 128Mi |

## Database Dependencies

Bitnami postgresql is deployed per JVM service (user, content, recommendation). Enable/disable via:

```yaml
userPostgresql:
  enabled: true
contentPostgresql:
  enabled: true
recommendationPostgresql:
  enabled: true
```

DB credentials are injected automatically into each service's pod as environment variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).

## Install / Upgrade

### 1. Set up kubeconfig

Download the kubeconfig from Rancher UI: top-right menu → **Download KubeConfig**.
Save it to a separate file to avoid overwriting your existing config:

```bash
# Save the downloaded file
cp ~/Downloads/kubeconfig.yaml ~/.kube/verita-rancher.yaml
chmod 600 ~/.kube/verita-rancher.yaml

# Point kubectl and helm at it for this session
export KUBECONFIG=~/.kube/verita-rancher.yaml

# Verify
kubectl get pods -n team-md
```

### 2. Update Helm dependencies

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm dependency update .
```

### 4. Deploy

Dev environment:

```bash
helm upgrade --install verita . \
  -f values.yaml \
  -f values-dev.yaml \
  --namespace team-md --create-namespace
```

Prod environment:

```bash
helm upgrade --install verita . \
  -f values.yaml \
  -f values-prod.yaml \
  --namespace team-md --create-namespace
```

### Override individual values

```bash
helm upgrade --install verita . \
  -f values.yaml -f values-dev.yaml \
  --namespace team-md \
  --set services.user.tag=abc1234 \
  --set ingress.host=verita.my-domain.example
```

### Dry run (render templates without deploying)

```bash
helm template verita . -f values.yaml -f values-dev.yaml
```

## Typical Endpoints

Assuming `ingress.host` is set:

- `https://<host>/` → frontend UI
- `https://<host>/user/api/v1/...` → user service
- `https://<host>/content/api/v1/...` → content service
- `https://<host>/recommendation/api/v1/...` → recommendation service
- `https://<host>/genai/health` → genai service
- `https://<host>/summarization/health` → genai (summarization path)

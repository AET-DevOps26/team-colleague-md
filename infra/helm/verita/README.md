# Verita Helm Chart

Umbrella Helm chart for the Verita platform. The five application services (user, content, recommendation, genai, frontend) are defined in `values.yaml` and rendered from a single set of range-based templates. Stateful dependencies are pulled in as subcharts.

Subchart dependencies:
- Bitnami `postgresql` — aliased per service (`user-postgresql`, `content-postgresql`, `recommendation-postgresql`)
- Official MinIO chart (`https://charts.min.io/`) — object storage for avatars and post photos

Namespaces: `verita-dev` and `verita-prod` (one release per environment).

## Requirements

- Helm 3.x (install locally)
- Kubernetes cluster with an Ingress controller — provided by the TUM Rancher cluster
- `cert-manager` with the `ClusterIssuer` referenced by the environment (`letsencrypt-staging` for dev, `letsencrypt-prod` for prod) — pre-installed by cluster admins

## Key Files

| File | Purpose |
|------|---------|
| `Chart.yaml` | Chart metadata; postgresql and minio subchart dependencies |
| `values.yaml` | Base values — all services, resources, ingress, minio |
| `values-dev.yaml` | Dev overrides (image tags → `dev`, dev host, staging issuer) |
| `values-prod.yaml` | Prod overrides (host, `letsencrypt-prod` issuer; tags default to `latest`) |
| `templates/deployment.yaml` | Single template, loops over all services |
| `templates/service.yaml` | Single template, loops over all services |
| `templates/ingress.yaml` | Single Ingress, routes everything to the frontend |

## Images and Registry

Registry prefix is set under `global.registry` in `values.yaml`:

```
ghcr.io/aet-devops26/team-colleague-md
```

Each service's resolved image:

```
<global.registry>/<services.<name>.image>:<services.<name>.tag>
```

Image pull credentials are configured via `global.imagePullSecrets`.

## Routing — frontend nginx as the API gateway

The Ingress is intentionally trivial: a **single rule** routing `/` to the frontend. The frontend container's nginx is the API gateway — it reverse-proxies the API prefixes to the in-cluster services (the same `nginx.conf` used on the Azure VM, so both environments route identically).

```
Browser → Ingress (/) → frontend nginx ─┬─ /user/        → user-service:8081
                                         ├─ /content/     → content-service:8082
                                         ├─ /recommendation/ → recommendation-service:8083
                                         ├─ /genai/       → genai-service:8000
                                         ├─ /storage/     → minio:9000
                                         └─ /             → SPA (index.html)
```

The backend service URLs are injected into the frontend pod via the `proxyBackend` block in `deployment.yaml` (`USER_SERVICE_URL`, `CONTENT_SERVICE_URL`, `RECOMMENDATION_SERVICE_URL`, `GENAI_SERVICE_URL`, `MINIO_URL`).

This keeps the Ingress free of rewrite/regex annotations (which previously broke static-asset serving and conflicted with the nginx admission webhook), and keeps the backends off the public Ingress.

## Service Ports and Resources

Configured in `values.yaml` under `services.<name>`:

| Service | Port | Memory limit | Replicas |
|---------|------|-------------|----------|
| user | 8081 | 512Mi | 1 |
| content | 8082 | 512Mi | 1 |
| recommendation | 8083 | 512Mi | 1 |
| genai | 8000 | 256Mi | 2 |
| frontend | 80 | 128Mi | 2 |

## Stateful Dependencies

### PostgreSQL

Bitnami postgresql is deployed per JVM service. Enable/disable via the aliased subchart keys (note the hyphens):

```yaml
user-postgresql:
  enabled: true
content-postgresql:
  enabled: true
recommendation-postgresql:
  enabled: true
```

DB credentials are injected automatically into each service's pod (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).

### MinIO

Deployed via the official MinIO chart (standalone, single replica). The chart's post-install job provisions the buckets (`verita-user-portraits`, `verita-post-photos`) with a `download` policy for public asset URLs. Services read the root credentials from the `<release>-minio` Secret (keys `rootUser`/`rootPassword`), injected as `STORAGE_S3_*` env vars.

```yaml
minio:
  enabled: true
  mode: standalone
  rootUser: verita_minio
  rootPassword: verita_minio_password   # overridden in CI via --set minio.rootPassword
```

## Install / Upgrade

### 1. Set up kubeconfig

Download the kubeconfig from Rancher UI: top-right menu → **Download KubeConfig**.

```bash
cp ~/Downloads/kubeconfig.yaml ~/.kube/verita-rancher.yaml
chmod 600 ~/.kube/verita-rancher.yaml
export KUBECONFIG=~/.kube/verita-rancher.yaml
kubectl get pods -n verita-dev
```

### 2. Update Helm dependencies

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add minio https://charts.min.io/
helm dependency update .
```

### 3. Deploy

Dev environment:

```bash
helm upgrade --install verita . \
  -f values.yaml \
  -f values-dev.yaml \
  --namespace verita-dev --create-namespace
```

Prod environment:

```bash
helm upgrade --install verita . \
  -f values.yaml \
  -f values-prod.yaml \
  --namespace verita-prod --create-namespace \
  --set minio.rootPassword=<strong-password>
```

### Clean reinstall (wipes data)

If the release ends up in a broken state, a full reinstall resets it (deletes database and MinIO data):

```bash
helm uninstall verita -n verita-dev
kubectl delete pvc --all -n verita-dev
helm install verita . -f values.yaml -f values-dev.yaml \
  --namespace verita-dev --create-namespace --timeout 5m
```

### Dry run (render templates without deploying)

```bash
helm template verita . -f values.yaml -f values-dev.yaml
```

## Typical Endpoints

Assuming `ingress.host` is set:

- `https://<host>/` → frontend UI
- `https://<host>/user/api/v1/...` → user service (via frontend nginx)
- `https://<host>/content/api/v1/...` → content service
- `https://<host>/recommendation/api/v1/...` → recommendation service
- `https://<host>/genai/api/v1/genai/...` → genai service
- `https://<host>/storage/...` → MinIO objects

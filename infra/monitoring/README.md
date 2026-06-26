# Verita Monitoring

Prometheus + Grafana monitoring for all Verita backend services, across both deployment
targets. The application instrumentation is identical on both sides (same Micrometer metric
names), so the **alert rules and the Grafana dashboard are shared** — only service discovery
and the infra-level exporters differ.

## What is collected

| Layer | Source | Examples |
|-------|--------|----------|
| HTTP (RED) | Spring Micrometer `/actuator/prometheus`, genai `/metrics` | request rate, 5xx ratio, p95/p99 latency |
| JVM | Micrometer | heap/non-heap, GC pauses, threads |
| DB pool | Micrometer HikariCP | active/idle/pending connections, acquire time |
| PostgreSQL | postgres_exporter | `pg_up`, connections vs max, cache hit ratio, deadlocks |
| Host (Azure only) | node-exporter | CPU, memory, disk |
| Container (Azure only) | cAdvisor | per-container CPU/memory vs limit |

> Host/container metrics are **Azure-only**. The Rancher deployment runs in a shared TUM
> namespace without cluster-admin, so node-exporter (DaemonSet) and cAdvisor (kubelet access)
> are not available there. App + database metrics are fully covered on both.

## Application instrumentation (shared)

- Spring services: `io.micrometer:micrometer-registry-prometheus` on the classpath;
  `management.endpoints.web.exposure.include=health,info,prometheus`. Metrics are served on
  the **main app port** and kept off the public surface by the nginx gateway (`/…/actuator`
  is returned 404) — backends are not publicly exposed. A dedicated `@Order(0)` actuator
  `SecurityFilterChain` permits unauthenticated scraping of `/actuator/**`.
- genai-service: `prometheus-fastapi-instrumentator` exposes `/metrics`; the gateway returns
  404 for `/genai/metrics`.

## Rancher (Helm) — self-hosted, namespace-scoped ("Model B")

Lives inside the `verita` umbrella chart, gated by `monitoring.enabled` (default `true`).
No Prometheus Operator / CRDs and no cluster-scoped RBAC.

- Prometheus discovers targets by the `prometheus.io/{scrape,port,path}` annotations the
  chart puts on each Service, restricted to the release namespace (namespaced `Role`).
- PostgreSQL: the bitnami `postgresql` subcharts run the `postgres_exporter` sidecar
  (`metrics.enabled: true` with explicit `resources.limits`, required by the ResourceQuota).
  Prometheus discovers them by the `metrics` port name.
- Grafana is provisioned with the Prometheus datasource and the shared dashboard.

Access Grafana — two options:

1. Via the shared Ingress (default, `monitoring.grafana.ingress.enabled: true`):
   `https://<ingress.host>/grafana` — e.g. `https://dev.verita.stud.k8s.aet.cit.tum.de/grafana`.
2. Port-forward (no Ingress / quick local check):
   ```bash
   kubectl -n <namespace> port-forward svc/<release>-grafana 3000:3000
   # http://localhost:3000
   ```

Login: `admin` / `monitoring.grafana.adminPassword` (dev default `verita_grafana_admin`;
override per environment). Stored in the `<release>-grafana-admin` Secret.

Pre-flight (confirm the namespace allows it):
```bash
kubectl describe resourcequota
kubectl get storageclass
kubectl auth can-i create role,rolebinding,deployment,pvc,configmap
```
Set `monitoring.storageClass` if the namespace has no default StorageClass.

## Azure (Docker Compose)

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d
```
Adds Prometheus, Grafana, node-exporter, cAdvisor and one postgres_exporter per database.
Prometheus and Grafana bind to `127.0.0.1` only — reach them over an SSH tunnel:
```bash
ssh -L 3000:127.0.0.1:3000 -L 9090:127.0.0.1:9090 <vm>
```
Set `GRAFANA_ADMIN_PASSWORD` (and DB credential vars, shared with the app stack) in the env.

### Local development (Docker Desktop)

Swap the prod app stack for the dev one and add the local override:
```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.monitoring.local.yml up -d
# Grafana  http://localhost:3001   Prometheus  http://localhost:9090   (admin / verita_grafana_admin)
```
The override is required locally for two reasons: it remaps Grafana to `3001` (the dev
frontend already publishes `3000`), and it parks node-exporter in an unused profile — its
`rslave` host-root mount is rejected by Docker Desktop's WSL2 backend and would otherwise
abort the whole `up`. The Prometheus `node` target therefore reads DOWN locally by design.
The postgres-exporters default to the base `docker-compose.yml` DB credentials (the `svc_*`
users), so no env vars are needed locally.

## Shared files (single source of truth)

Helm's `.Files.Get` cannot read outside the chart, so the chart owns the shared assets and
the compose stack mounts the same paths:
- Alert rules (app + DB): `infra/helm/verita/files/verita-alerts.yml`
- Grafana dashboard: `infra/helm/verita/dashboards/verita-overview.json`

Azure-only config lives under `infra/monitoring/azure/` (Prometheus config, host/container
alerts, Grafana provisioning).

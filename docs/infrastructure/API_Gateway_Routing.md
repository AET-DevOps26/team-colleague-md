# API Gateway & Routing

Verita uses a **path-prefix routing** pattern across all environments. Each backend service owns a URL prefix; the gateway strips that prefix before forwarding, so Spring Boot and FastAPI always receive paths that match their OpenAPI specs.

## URL Convention

| Prefix | Service | Internal port |
|--------|---------|---------------|
| `/user` | user-service | 8081 |
| `/content` | content-service | 8082 |
| `/recommendation` | recommendation-service | 8083 |
| `/genai` | genai-service | 8000 |
| `/storage` | MinIO object storage | 9000 |
| `/` (catch-all) | frontend SPA | 80 |

**Example:** to call `POST /api/v1/auth/login` on user-service, the external URL is:
```
POST <host>/user/api/v1/auth/login
```
The gateway strips `/user`, and user-service receives `/api/v1/auth/login` — identical to its OpenAPI definition.

Frontend React routes (`/profile/:username`, `/post/:id`, `/digest`, `/search`, …) intentionally use paths that do not conflict with any service prefix, so they always fall through to the SPA catch-all.

---

## Environment 1 — Local Development (Vite, port 3000)

The Vite dev server acts as both bundler and reverse proxy.

```
Browser → localhost:3000 (Vite)
    ├── /user/*           strip /user       → localhost:8081
    ├── /content/*        strip /content    → localhost:8082
    ├── /recommendation/* strip /recomm.    → localhost:8083
    ├── /genai/*          strip /genai      → localhost:8000
    └── *                                   → index.html (React Router)
```

Config: `frontend/vite.config.ts`

| Request | Path | Reaches |
|---------|------|---------|
| Page navigation | `localhost:3000/profile/alice` | React renders UserProfile |
| Login | `POST /user/api/v1/auth/login` | `localhost:8081/api/v1/auth/login` |
| Direct API test | `localhost:8081/api/v1/auth/login` | user-service directly (bypasses Vite) |

---

## Environment 2 — Azure VM (Docker Compose, port 80 only)

The frontend nginx container is the single public entry point on port 80. All backend services are inside the Docker network and are not reachable from outside.

```
Browser → <VM_IP>:80 (nginx)
    ├── /user/           proxy_pass → user-service:8081
    ├── /content/        proxy_pass → content-service:8082
    ├── /recommendation/ proxy_pass → recommendation-service:8083
    ├── /genai/          proxy_pass → genai-service:8000
    ├── /storage/        proxy_pass → minio:9000
    └── /                try_files  → index.html (React Router)
```

Config: `frontend/nginx.conf`, `frontend/Dockerfile` (envsubst at runtime), `docker-compose.prod.yml`

**How nginx strips the prefix:**
```nginx
location /user/ {
    proxy_pass http://user-service:8081/;  # trailing slash replaces /user/
}
```
`/user/api/v1/auth/login` → forwards as `/api/v1/auth/login` ✓

| Request | Path | Reaches |
|---------|------|---------|
| Page navigation | `<VM_IP>/post/123` | nginx → index.html → React |
| Login | `POST /user/api/v1/auth/login` | `user-service:8081/api/v1/auth/login` |
| API test in browser | `<VM_IP>/user/api/v1/users/me/preferences` | `user-service:8081/api/v1/users/me/preferences` |
| Avatar image | `/storage/verita-user-portraits/abc.jpg` | `minio:9000/verita-user-portraits/abc.jpg` |

---

## Environment 3 — Rancher / Kubernetes (Helm + nginx Ingress)

The nginx Ingress Controller is the single public entry point on port 443 (TLS), but it is
**intentionally trivial**: one `Prefix` rule routes `/` to the frontend Service (plus one
sub-path rule for `/grafana` → Grafana when monitoring is enabled). The frontend pod's
nginx — the **same `nginx.conf` as on the Azure VM** — is the actual API gateway and does
all prefix stripping, so both deployed environments route identically.

```
Browser → verita.stud.k8s.aet.cit.tum.de:443 (Ingress, TLS via cert-manager)
    ├── /grafana   → grafana:3000        (monitoring sub-path)
    └── /          → frontend:80 (nginx)
                        ├── /user/           proxy_pass → user-service:8081
                        ├── /content/        proxy_pass → content-service:8082
                        ├── /recommendation/ proxy_pass → recommendation-service:8083
                        ├── /genai/          proxy_pass → genai-service:8000
                        ├── /storage/        proxy_pass → minio:9000
                        └── /                try_files  → index.html (React Router)
```

Config: `infra/helm/verita/templates/ingress.yaml` (Ingress), `frontend/nginx.conf`
(gateway; backend Service URLs injected via the `proxyBackend` env block in
`templates/deployment.yaml`)

An earlier iteration used per-service Ingress rules with `rewrite-target: /$2` regexes;
it was replaced by this single-rule design because the rewrites broke static-asset
serving and two same-host Ingresses tripped the nginx admission webhook on upgrade. It
also keeps the backends off the public Ingress entirely.

| Request | Path | Reaches |
|---------|------|---------|
| Page navigation | `/post/123` | Ingress → frontend nginx → index.html → React |
| Login | `POST /user/api/v1/auth/login` | frontend nginx → `user-service /api/v1/auth/login` |
| API test in browser | `host/user/api/v1/users/me/preferences` | frontend nginx → user-service |
| GenAI summarize | `host/genai/api/v1/genai/summarize` | frontend nginx → `genai-service /api/v1/genai/summarize` |
| Avatar image | `/storage/verita-user-portraits/abc.jpg` | frontend nginx → `minio:9000` |
| Grafana | `host/grafana` | Ingress sub-path rule → Grafana pod |

---

## Comparison

| | Local (Vite) | Azure VM (nginx) | K8s (Ingress + nginx) |
|--|--|--|--|
| Entry point | `localhost:3000` | `<VM_IP>:80` | `host:443` (TLS) |
| Gateway component | Vite proxy | nginx in frontend container | frontend nginx (behind a trivial `/` Ingress) |
| Prefix strip method | `rewrite` function | trailing slash on `proxy_pass` | trailing slash on `proxy_pass` (same nginx.conf) |
| Backend ports exposed externally | No (direct localhost) | No (Docker network only) | No (cluster network only) |
| Storage routing | Direct to `localhost:9000` | nginx → MinIO container | Ingress → frontend nginx → MinIO pod |

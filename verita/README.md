# Verita Helm chart

This repository contains the `verita` umbrella Helm chart. It packages these subcharts (see `Chart.yaml`):
- `content`
- `user`
- `recommendation`
- `genai`
- `frontend`

It also depends on Bitnami `postgresql` charts for per-service databases (aliased as `user-postgresql`, `content-postgresql`, and `recommendation-postgresql`). Each of those external dependencies can be enabled/disabled via the chart values (see `Chart.yaml` and subchart `values.yaml` files).

## Requirements
- A Kubernetes cluster with an Ingress controller
- `cert-manager` installed and a `ClusterIssuer` named `letsencrypt-staging` (the ingress template sets this issuer)
- Helm 3.x

## Image references and registry
The chart uses a shared registry prefix configured under `global.registry` in `values.yaml`.

Example resolved image reference format:
```
<registry-prefix>/<service-repository>:<tag>@<digest>
```
Defaults in this repository:
- `global.registry` in `values.yaml`: `ghcr.io/aet-devops26/team-colleague-md`
- `values-dev.yaml` overrides `global.registry` to `registry.example.com`
- `values-prod.yaml` sets image tags to `prod` for releases

Note: When a digest is pinned in `values.yaml`, Kubernetes will deploy that exact immutable image. If you set only `tag` (no digest) Kubernetes may pull a new image on pod restart.

## Ingress (routing)
`templates/ingress.yaml` creates a single Ingress for the configured host. The Ingress routes:

## Overview

This is the `verita` umbrella Helm chart for the Team Colleague platform. It bundles the following local subcharts (see `Chart.yaml`):

- `content`
- `user`
- `recommendation`
- `genai`
- `frontend`

The umbrella chart also references Bitnami `postgresql` as optional external dependencies (aliased per-service). See `Chart.yaml` for the dependency entries and the top-level `values.yaml` for configuration.

This README has been updated to reflect the actual chart files in this repository. Some values in the included `values-*.yaml` files are intended as examples and should be reviewed/overridden for your environment — the README tries to call out those placeholders explicitly.

Namespace used in examples below: `team-md`.

## Key files

- `Chart.yaml` — umbrella chart and declared dependencies (including aliased PostgreSQL charts)
- `values.yaml` — default values (pinned image digests are present here)
- `values-dev.yaml` — development overrides (example registry/host)
- `values-prod.yaml` — production overrides (switches images to `prod` tags)
- `templates/ingress.yaml` — single Ingress routing for all sub-services
- `charts/` — local subcharts for frontend, user, content, recommendation, genai

## Images and registry

The chart uses a shared registry prefix at `global.registry` in `values.yaml`. Current defaults in the repository:

- `values.yaml`: `global.registry: ghcr.io/aet-devops26/team-colleague-md` (contains pinned digests for dev images)
- `values-dev.yaml`: `global.registry: registry.example.com` (example value intended to be changed)
- `values-prod.yaml`: `global.registry: ghcr.io/aet-devops26/team-colleague-md` and `tag: prod` for subcharts

Image reference format the chart resolves to:

  <registry>/<repository>:<tag>@<digest?>

Notes:
- If a digest is present in the values, Kubernetes will pull that exact immutable image.
- If you rely only on tags (no digest), images can change on redeploy or image tag updates in the registry.

## Ingress and routing

`templates/ingress.yaml` creates one Ingress for the configured host and routes paths to the appropriate services:

- `/` -> `frontend`
- `/user` -> `user`
- `/content` -> `content`
- `/recommendation` -> `recommendation`
- `/genai` and `/summarization` -> `genai`

The Ingress resource includes the annotation:

  cert-manager.io/cluster-issuer: letsencrypt-staging

Ensure you have `cert-manager` installed and a `ClusterIssuer` named `letsencrypt-staging` or edit the annotation to match an issuer available in your cluster.

Ingress values present in the repo:

- `values.yaml` (default) host: `verita.stud.k8s.aet.cit.tum.de`
- `values-dev.yaml` host: `verita.k8s.ase.cit.tum.de` (example)
- `values-prod.yaml` host: `example.k8s.ase.cit.tum.de` (placeholder — replace for production)

If `ingress.enabled` is `false`, no Ingress will be created.

## Ports and service defaults

Top-level `values.yaml` configures service ports (used by the ingress backend):

- `user.service.port`: 8081
- `content.service.port`: 8082
- `recommendation.service.port`: 8083
- `genai.service.port`: 8000
- `frontend.service.port`: 80

Resource requests/limits are defined in `values.yaml` under `resources` for basic sizing.

## Database dependencies

The umbrella chart lists Bitnami `postgresql` charts aliased for service-local databases. These are optional and can be enabled/disabled by values such as `userPostgresql.enabled`, `contentPostgresql.enabled`, and `recommendationPostgresql.enabled`.

Configure DB credentials and persistence using the usual chart values for the aliased PostgreSQL charts (see `Chart.yaml` and the Bitnami chart documentation for available settings).

## Install / Upgrade (use namespace `team-md`)

Deploy to the `team-md` namespace. Examples below use PowerShell syntax.

Development (uses `values-dev.yaml`):

```powershell
helm upgrade --install verita . -n team-md --create-namespace -f values-dev.yaml
```

Production (uses `values-prod.yaml`; *update values-prod.yaml host and registry before deploying to production*):

```powershell
helm upgrade --install verita . -n team-md --create-namespace -f values-prod.yaml
```

Deploy using the pinned digests in the default `values.yaml` (no environment override):

```powershell
helm upgrade --install verita . -n team-md --create-namespace
```

If you need to override individual values on the command line (e.g., change host or registry):

```powershell
helm upgrade --install verita . -n team-md --create-namespace --set global.registry="my.registry.example" --set ingress.host="verita.my-domain.example"
```

## Typical URL layout

Assuming `ingress.host` is set, example endpoints are:

- `https://<ingress.host>/` -> frontend UI
- `https://<ingress.host>/user/api/v1/...` -> user service
- `https://<ingress.host>/content/api/v1/...` -> content service
- `https://<ingress.host>/recommendation/api/v1/...` -> recommendation service
- `https://<ingress.host>/genai/health` -> genai
- `https://<ingress.host>/summarization/health` -> genai (summarization path)

Replace `<ingress.host>` with the host value from the `values-*.yaml` file you used to install the chart.

## Recommendations before production

- Replace any placeholder host values in `values-prod.yaml` with your real domain.
- Replace example registries with your private or organization registry and ensure image tags/digests are correct.
- Pin image digests for production images (or use an immutable tagging strategy) to avoid accidental changes.
- Verify `cert-manager` and the referenced `ClusterIssuer` exist, or remove/change the ingress annotation if you manage TLS differently.

## Where to look next

- `Chart.yaml` — see dependencies and aliases
- `values.yaml`, `values-dev.yaml`, `values-prod.yaml` — environment defaults and overrides
- `templates/ingress.yaml` — ingress rules and annotations
- `charts/<subchart>/values.yaml` — per-service settings

---

If you want, I can: create a small script to validate the values files, replace placeholders automatically, or open a patch that updates `values-prod.yaml` host/registry with concrete values you provide. Which would you like next?
- `https://<ingress.host>/content/api/v1/...` -> content service
- `https://<ingress.host>/recommendation/api/v1/...` -> recommendation service
- `https://<ingress.host>/genai/health` -> genai health
- `https://<ingress.host>/summarization/health` -> summarization health (routes to genai)

Replace `<ingress.host>` with the host defined in your chosen values file (`values-dev.yaml`, `values-prod.yaml`, or `values.yaml`).

## Notes & recommendations
- Replace `global.registry` values with your real registry before production deployment.
- If you don't want `cert-manager` to manage TLS for you, change or remove the `cert-manager.io/cluster-issuer` annotation in `templates/ingress.yaml`.
- To avoid unexpected image updates in production, pin image digests (as done in `values.yaml`) or use an immutable registry workflow.
- Check each subchart's `values.yaml` (in `charts/<subchart>/values.yaml`) for service-specific configuration.

## Where to look in the chart
- `Chart.yaml` — umbrella chart and dependencies.
- `values.yaml`, `values-dev.yaml`, `values-prod.yaml` — default and environment values.
- `templates/ingress.yaml` — ingress resource that defines routes and TLS.
- `charts/` — local subcharts (frontend, user, content, recommendation, genai) and packaged dependencies.
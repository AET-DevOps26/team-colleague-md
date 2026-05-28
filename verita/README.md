# Verita Helm chart
This repository now uses `verita` as an umbrella chart with five subcharts:
- `content`
- `user`
- `recommendation`
- `genai`
- `frontend`
## Ingress setup
The chart assumes the cluster already provides:
- an Ingress controller
- a cert-manager `ClusterIssuer` named `letsencrypt-staging`
The chart creates one Ingress resource for the same host:
- `/` frontend routing to the `frontend` service
- `/user`, `/content`, `/recommendation`, `/genai`, and `/summarization` API routing
Configured default host:
- `example.k8s.ase.cit.tum.de`
## Images
The chart uses a shared registry prefix and service-specific repository names.
The defaults are placeholders and should be replaced with your actual registry.
Example resolved image:
- `registry.example.com/verita/content:latest`
## Install
```powershell
helm upgrade --install verita . -n my-namespace --create-namespace -f values-dev.yaml
```
## Typical URL layout
- `https://example.k8s.ase.cit.tum.de/`
- `https://example.k8s.ase.cit.tum.de/user/api/v1/auth/login`
- `https://example.k8s.ase.cit.tum.de/content/api/v1/posts`
- `https://example.k8s.ase.cit.tum.de/recommendation/api/v1/feed/personal`
- `https://example.k8s.ase.cit.tum.de/genai/health`
- `https://example.k8s.ase.cit.tum.de/summarization/health`
## Notes
- Install into a namespace with `helm -n <namespace>`.
- Replace the image repository placeholders with your real registry before deployment.
- The frontend test hook checks the in-cluster `frontend` service.

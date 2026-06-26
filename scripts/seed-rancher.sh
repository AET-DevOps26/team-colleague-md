#!/usr/bin/env bash
#
# Seed demo data into verita-dev (Rancher / k8s) using the existing seed script.
#
# DEV ONLY. The DB/MinIO credentials below are the committed values.yaml dev
# defaults, so this needs NO `kubectl get secret` (which the TUM cluster may not
# grant) and NO GitHub secret access. It port-forwards the in-cluster ClusterIP
# Postgres + MinIO services to localhost, then runs `npm run seed:local` against
# them. Idempotent (the seed upserts), safe to re-run.
#
# Prod is intentionally unsupported — its real credentials live only as cluster
# Secrets and seeding real prod with demo data is undesirable. For prod, use the
# in-cluster Job approach (see docs/Seeding_Remote_Environments.md).
#
# Usage:
#   ./scripts/seed-rancher.sh                 # seed everything into verita-dev
#   SEED_ONLY=users,content ./scripts/seed-rancher.sh
#
# Requires: kubectl (with a verita-dev context), node + npm.
set -euo pipefail

NAMESPACE="${NAMESPACE:-verita-dev}"
RELEASE="${RELEASE:-verita}"
INGRESS_HOST="${INGRESS_HOST:-dev.verita.stud.k8s.aet.cit.tum.de}"
SEED_ONLY="${SEED_ONLY:-}"

# --- prod guard: dev defaults won't connect to prod anyway, but fail loud. ---
case "$NAMESPACE" in
  verita-dev) ;;
  *prod*)
    echo "Refusing: namespace '$NAMESPACE' looks like prod." >&2
    echo "This script seeds verita-dev only (it uses committed dev credentials)." >&2
    echo "To seed prod, use the in-cluster Job — see docs/Seeding_Remote_Environments.md." >&2
    exit 1 ;;
  *)
    echo "Refusing: unexpected namespace '$NAMESPACE' (expected verita-dev)." >&2
    exit 1 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Committed dev credentials (infra/helm/verita/values.yaml).
DEV_DB_PASSWORD="verita_password"

declare -a PF_PIDS=()
cleanup() {
  for pid in "${PF_PIDS[@]:-}"; do
    [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT

port_forward() { # service localport remoteport
  kubectl -n "$NAMESPACE" port-forward "svc/$1" "$2:$3" >/dev/null 2>&1 &
  PF_PIDS+=("$!")
}

wait_for_port() { # localport
  for _ in $(seq 1 40); do
    (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && { exec 3>&- 3<&-; return 0; }
    sleep 0.5
  done
  echo "Timed out waiting for 127.0.0.1:$1 (port-forward failed)." >&2
  return 1
}

echo "==> Port-forwarding verita-dev Postgres + MinIO from namespace '$NAMESPACE'"
port_forward "$RELEASE-user-postgresql"           5432 5432
port_forward "$RELEASE-content-postgresql"        5433 5432
port_forward "$RELEASE-recommendation-postgresql" 5434 5432
port_forward "$RELEASE-minio"                      9000 9000

for hostport in 5432 5433 5434 9000; do
  wait_for_port "$hostport"
done
echo "==> Port-forwards ready."

echo "==> Running seed (${SEED_ONLY:-all domains})"
USER_DB_HOST=127.0.0.1 USER_DB_PORT=5432 USER_DB_NAME=verita_users USER_DB_USER=svc_user USER_DB_PASSWORD="$DEV_DB_PASSWORD" \
CONTENT_DB_HOST=127.0.0.1 CONTENT_DB_PORT=5433 CONTENT_DB_NAME=verita_contents CONTENT_DB_USER=svc_content CONTENT_DB_PASSWORD="$DEV_DB_PASSWORD" \
RECOMMENDATION_DB_HOST=127.0.0.1 RECOMMENDATION_DB_PORT=5434 RECOMMENDATION_DB_NAME=verita_recommendations RECOMMENDATION_DB_USER=svc_recommendation RECOMMENDATION_DB_PASSWORD="$DEV_DB_PASSWORD" \
USER_STORAGE_S3_ENDPOINT="http://127.0.0.1:9000" USER_STORAGE_S3_PUBLIC_ENDPOINT="https://$INGRESS_HOST/storage" \
USER_STORAGE_S3_ACCESS_KEY=user-service USER_STORAGE_S3_SECRET_KEY=user-service-s3-secret \
CONTENT_STORAGE_S3_ENDPOINT="http://127.0.0.1:9000" CONTENT_STORAGE_S3_PUBLIC_ENDPOINT="https://$INGRESS_HOST/storage" \
CONTENT_STORAGE_S3_ACCESS_KEY=content-service CONTENT_STORAGE_S3_SECRET_KEY=content-service-s3-secret \
  npm --prefix "$ROOT" run seed:local ${SEED_ONLY:+-- --only "$SEED_ONLY"}

echo "==> Done. verita-dev seeded."

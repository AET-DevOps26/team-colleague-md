#!/usr/bin/env bash
#
# Seed demo data into Rancher / Kubernetes using the existing seed script.
#
# The default target is verita-dev, using the committed values.yaml credentials.
# Production-demo mode is explicit and intended for the manual GitHub Actions
# workflow, which supplies the production credentials from GitHub Secrets.
#
# Both modes port-forward the in-cluster ClusterIP PostgreSQL and MinIO services
# to localhost, then run `npm run seed:local` against them.
#
# Usage:
#   ./scripts/seed-rancher.sh                 # seed everything into verita-dev
#   SEED_ONLY=users,content ./scripts/seed-rancher.sh
#   SEED_RESET=1 ./scripts/seed-rancher.sh    # purge stale seed rows first, then re-seed
#   RANCHER_ENV=prod ./scripts/seed-rancher.sh # GitHub Actions; requires prod secrets
#
# SEED_RESET deletes only seed-owned rows (users with @example.com emails and the
# data they own, plus system digests) before seeding. Posts created manually by a
# seeded demo account are seed-owned too. Production-demo mode rejects SEED_ONLY and
# requires SEED_RESET_CONFIRM=verita-prod alongside SEED_RESET (needed when prod holds
# seed rows from before the deterministic-ID fixtures, which upserts cannot reconcile).
#
# Requires: kubectl (with access to the selected namespace), node + npm.
# Stop local Docker Compose PostgreSQL and MinIO instances first; this script must
# bind local ports 5432, 5433, 5434, and 9000 for its Kubernetes port-forwards.
set -euo pipefail

RANCHER_ENV="${RANCHER_ENV:-dev}"
NAMESPACE="${NAMESPACE:-}"
RELEASE="${RELEASE:-verita}"
INGRESS_HOST="${INGRESS_HOST:-}"
SEED_ONLY="${SEED_ONLY:-}"
SEED_RESET="${SEED_RESET:-}"   # set to any non-empty value to purge stale seed rows before re-seeding
SEED_RESET_CONFIRM="${SEED_RESET_CONFIRM:-}"   # must equal "verita-prod" for SEED_RESET in prod mode

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Missing required production-demo credential: $name." >&2
    exit 1
  fi
}

case "$RANCHER_ENV" in
  dev)
    NAMESPACE="${NAMESPACE:-verita-dev}"
    INGRESS_HOST="${INGRESS_HOST:-dev.verita.stud.k8s.aet.cit.tum.de}"
    if [ "$NAMESPACE" != "verita-dev" ]; then
      echo "Refusing: dev mode only supports namespace 'verita-dev', got '$NAMESPACE'." >&2
      exit 1
    fi

    # Committed development credentials (infra/helm/verita/values.yaml).
    USER_DB_SEED_PASSWORD="verita_password"
    CONTENT_DB_SEED_PASSWORD="verita_password"
    RECOMMENDATION_DB_SEED_PASSWORD="verita_password"
    USER_STORAGE_SEED_SECRET_KEY="user-service-s3-secret"
    CONTENT_STORAGE_SEED_SECRET_KEY="content-service-s3-secret"
    ;;
  prod)
    if [ -n "$NAMESPACE" ] && [ "$NAMESPACE" != "verita-prod" ]; then
      echo "Refusing: prod mode only supports namespace 'verita-prod', got '$NAMESPACE'." >&2
      exit 1
    fi
    if [ -n "$INGRESS_HOST" ] && [ "$INGRESS_HOST" != "verita.stud.k8s.aet.cit.tum.de" ]; then
      echo "Refusing: prod mode only supports ingress host 'verita.stud.k8s.aet.cit.tum.de', got '$INGRESS_HOST'." >&2
      exit 1
    fi
    if [ -n "$SEED_ONLY" ]; then
      echo "Refusing: prod mode always seeds all domains; SEED_ONLY is unsupported." >&2
      exit 1
    fi
    if [ -n "$SEED_RESET" ] && [ "$SEED_RESET_CONFIRM" != "verita-prod" ]; then
      echo "Refusing: SEED_RESET in prod purges seed-owned rows. Set SEED_RESET_CONFIRM=verita-prod to confirm." >&2
      exit 1
    fi

    NAMESPACE="verita-prod"
    INGRESS_HOST="verita.stud.k8s.aet.cit.tum.de"
    for name in \
      USER_DB_PASSWORD \
      CONTENT_DB_PASSWORD \
      RECOMMENDATION_DB_PASSWORD \
      USER_STORAGE_S3_SECRET_KEY \
      CONTENT_STORAGE_S3_SECRET_KEY; do
      require_env "$name"
    done

    USER_DB_SEED_PASSWORD="$USER_DB_PASSWORD"
    CONTENT_DB_SEED_PASSWORD="$CONTENT_DB_PASSWORD"
    RECOMMENDATION_DB_SEED_PASSWORD="$RECOMMENDATION_DB_PASSWORD"
    USER_STORAGE_SEED_SECRET_KEY="$USER_STORAGE_S3_SECRET_KEY"
    CONTENT_STORAGE_SEED_SECRET_KEY="$CONTENT_STORAGE_S3_SECRET_KEY"
    ;;
  *)
    echo "Unsupported RANCHER_ENV '$RANCHER_ENV' (expected 'dev' or 'prod')." >&2
    exit 1
    ;;
esac

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

echo "==> Port-forwarding PostgreSQL + MinIO from namespace '$NAMESPACE'"
port_forward "$RELEASE-user-postgresql"           5432 5432
port_forward "$RELEASE-content-postgresql"        5433 5432
port_forward "$RELEASE-recommendation-postgresql" 5434 5432
port_forward "$RELEASE-minio"                      9000 9000

for hostport in 5432 5433 5434 9000; do
  wait_for_port "$hostport"
done
echo "==> Port-forwards ready."

SEED_ARGS=()
[ -n "$SEED_ONLY" ] && SEED_ARGS+=(--only "$SEED_ONLY")
[ -n "$SEED_RESET" ] && SEED_ARGS+=(--reset)

run_seed() {
  USER_DB_HOST=127.0.0.1 USER_DB_PORT=5432 USER_DB_NAME=verita_users USER_DB_USER=svc_user USER_DB_PASSWORD="$USER_DB_SEED_PASSWORD" \
  CONTENT_DB_HOST=127.0.0.1 CONTENT_DB_PORT=5433 CONTENT_DB_NAME=verita_contents CONTENT_DB_USER=svc_content CONTENT_DB_PASSWORD="$CONTENT_DB_SEED_PASSWORD" \
  RECOMMENDATION_DB_HOST=127.0.0.1 RECOMMENDATION_DB_PORT=5434 RECOMMENDATION_DB_NAME=verita_recommendations RECOMMENDATION_DB_USER=svc_recommendation RECOMMENDATION_DB_PASSWORD="$RECOMMENDATION_DB_SEED_PASSWORD" \
  USER_STORAGE_S3_ENDPOINT="http://127.0.0.1:9000" USER_STORAGE_S3_PUBLIC_ENDPOINT="https://$INGRESS_HOST/storage" \
  USER_STORAGE_S3_ACCESS_KEY=user-service USER_STORAGE_S3_SECRET_KEY="$USER_STORAGE_SEED_SECRET_KEY" \
  CONTENT_STORAGE_S3_ENDPOINT="http://127.0.0.1:9000" CONTENT_STORAGE_S3_PUBLIC_ENDPOINT="https://$INGRESS_HOST/storage" \
  CONTENT_STORAGE_S3_ACCESS_KEY=content-service CONTENT_STORAGE_S3_SECRET_KEY="$CONTENT_STORAGE_SEED_SECRET_KEY" \
    npm --prefix "$ROOT" run seed:local -- "$@"
}

if [ "$RANCHER_ENV" = "prod" ]; then
  echo "==> Preflighting all production-demo seed domains (dry run${SEED_RESET:+, reset})"
  run_seed --dry-run "${SEED_ARGS[@]}"
fi

echo "==> Running seed (${SEED_ONLY:-all domains}${SEED_RESET:+, reset})"
run_seed "${SEED_ARGS[@]}"

echo "==> Done. Namespace '$NAMESPACE' seeded."

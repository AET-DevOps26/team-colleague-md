#!/usr/bin/env bash
#
# Seed demo data into the Azure VM (docker-compose.prod.yml) using the existing
# seed script. Run this from your DEV machine.
#
# The VM publishes no Postgres/MinIO ports, so the seed must run *inside* the
# prod compose network. This ships the seed code to the VM and runs it in a
# one-off node:22-alpine container attached to that network (Approach A — no new
# image is built or pushed). Credentials are read from the VM's own .env (written
# by Ansible from the GitHub secrets), so no GitHub secret access is needed here.
# Idempotent (the seed upserts), safe to re-run.
#
# Usage:
#   VM_HOST=<public-ip> ./scripts/seed-vm.sh
#   VM_HOST=<public-ip> SEED_ONLY=users,content ./scripts/seed-vm.sh
#
# Env (defaults match infra/ansible/inventory.ini + group_vars/all.yml):
#   VM_HOST       required — VM public IP (terraform output vm_public_ip)
#   VM_USER       default: azureuser
#   SSH_KEY       default: ~/.ssh/verita_key
#   DEPLOY_DIR    default: /home/azureuser/verita  (holds docker-compose.prod.yml + .env)
#   SEED_NETWORK  optional — override the compose network (auto-detected otherwise)
#   NODE_IMAGE    default: node:22-alpine
set -euo pipefail

VM_HOST="${VM_HOST:?set VM_HOST to the Azure VM public IP (terraform output vm_public_ip)}"
VM_USER="${VM_USER:-azureuser}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/verita_key}"
DEPLOY_DIR="${DEPLOY_DIR:-/home/azureuser/verita}"
SEED_ONLY="${SEED_ONLY:-}"
SEED_NETWORK="${SEED_NETWORK:-}"
NODE_IMAGE="${NODE_IMAGE:-node:22-alpine}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_SEED_DIR="$DEPLOY_DIR/.seed"

SSH=(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$VM_USER@$VM_HOST")

# Only the files the seed needs to run.
PKG_FILES=(scripts package.json package-lock.json tsconfig.json)

echo "==> Shipping seed code to $VM_USER@$VM_HOST:$REMOTE_SEED_DIR"
"${SSH[@]}" "mkdir -p '$REMOTE_SEED_DIR'"
tar -C "$ROOT" -czf - "${PKG_FILES[@]}" | "${SSH[@]}" "tar -C '$REMOTE_SEED_DIR' -xzf -"

echo "==> Running seed inside the prod compose network on the VM (${SEED_ONLY:-all domains})"
# Local values are passed as env to the remote bash; the heredoc is quoted so the
# secrets from .env expand on the VM, never on this machine or in this process list.
"${SSH[@]}" \
  "DEPLOY_DIR='$DEPLOY_DIR' REMOTE_SEED_DIR='$REMOTE_SEED_DIR' NODE_IMAGE='$NODE_IMAGE' SEED_ONLY='$SEED_ONLY' SEED_NETWORK='$SEED_NETWORK' bash -s" <<'REMOTE'
set -euo pipefail

# Resolve the compose network the DB containers live on.
NET="$SEED_NETWORK"
if [ -z "$NET" ]; then
  CID="$(docker ps --filter name=user-db --format '{{.ID}}' | head -n1)"
  [ -n "$CID" ] || { echo "user-db container not found — is the prod stack up?" >&2; exit 1; }
  NET="$(docker inspect -f '{{range $k,$_ := .NetworkSettings.Networks}}{{$k}}{{end}}' "$CID")"
fi
echo "==> docker network: $NET"

# Source the VM .env (secrets + VM-specific values written by Ansible).
[ -f "$DEPLOY_DIR/.env" ] || { echo ".env not found at $DEPLOY_DIR/.env" >&2; exit 1; }
set -a; . "$DEPLOY_DIR/.env"; set +a

ONLY_ARGS=""
[ -n "$SEED_ONLY" ] && ONLY_ARGS="-- --only $SEED_ONLY"

docker run --rm \
  --network "$NET" \
  -e USER_DB_HOST=user-db -e USER_DB_PORT=5432 -e USER_DB_NAME="${USER_DB_NAME:-verita_users}" -e USER_DB_USER="${USER_DB_USER:-svc_user}" -e USER_DB_PASSWORD="$USER_DB_PASSWORD" \
  -e CONTENT_DB_HOST=content-db -e CONTENT_DB_PORT=5432 -e CONTENT_DB_NAME="${CONTENT_DB_NAME:-verita_contents}" -e CONTENT_DB_USER="${CONTENT_DB_USER:-svc_content}" -e CONTENT_DB_PASSWORD="$CONTENT_DB_PASSWORD" \
  -e RECOMMENDATION_DB_HOST=recommendation-db -e RECOMMENDATION_DB_PORT=5432 -e RECOMMENDATION_DB_NAME="${RECOMMENDATION_DB_NAME:-verita_recommendations}" -e RECOMMENDATION_DB_USER="${RECOMMENDATION_DB_USER:-svc_recommendation}" -e RECOMMENDATION_DB_PASSWORD="$RECOMMENDATION_DB_PASSWORD" \
  -e USER_STORAGE_S3_ENDPOINT="http://minio:9000" -e USER_STORAGE_S3_PUBLIC_ENDPOINT="$STORAGE_S3_PUBLIC_ENDPOINT" \
  -e USER_STORAGE_S3_ACCESS_KEY="$USER_SERVICE_S3_ACCESS_KEY" -e USER_STORAGE_S3_SECRET_KEY="$USER_SERVICE_S3_SECRET_KEY" \
  -e USER_PORTRAITS_BUCKET="${STORAGE_USER_PORTRAITS_BUCKET:-verita-user-portraits}" \
  -e CONTENT_STORAGE_S3_ENDPOINT="http://minio:9000" -e CONTENT_STORAGE_S3_PUBLIC_ENDPOINT="$STORAGE_S3_PUBLIC_ENDPOINT" \
  -e CONTENT_STORAGE_S3_ACCESS_KEY="$CONTENT_SERVICE_S3_ACCESS_KEY" -e CONTENT_STORAGE_S3_SECRET_KEY="$CONTENT_SERVICE_S3_SECRET_KEY" \
  -e CONTENT_POST_PHOTOS_BUCKET="${STORAGE_POST_PHOTOS_BUCKET:-verita-post-photos}" \
  -v "$REMOTE_SEED_DIR":/app -w /app \
  "$NODE_IMAGE" sh -c "npm ci --no-audit --no-fund && npm run seed:local $ONLY_ARGS"

echo "==> Done. Azure VM seeded."
REMOTE

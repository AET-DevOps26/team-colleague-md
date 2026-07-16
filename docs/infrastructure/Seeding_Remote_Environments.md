# Seeding Demo Data into Remote Environments

The seed script under [`scripts/seed/`](../../scripts/seed) populates demo users,
posts, comments, votes, bookmarks and avatars. It is fully environment-agnostic
(everything is driven by env vars) and idempotent (upserts, safe to re-run). Out
of the box `npm run seed:local` targets a local `docker compose` stack; this doc
covers running the **same** script against the deployed demo environments.

> **No core changes.** These wrappers only add connectivity + credential wiring
> around the existing seed — the seed logic itself is untouched.

## What it does / doesn't seed

- **Topics already exist** in every environment — content-service's Flyway
  migration `V7__seed_topics.sql` seeds them on each deploy. The seed's topic
  upsert (`ON CONFLICT (name)`) is compatible with them.
- The DBs are otherwise **empty of users/posts** until seeded, so a freshly
  deployed environment shows an empty home feed. Run the seed to populate it.
- By default the seed only deletes the children of **its own** seed post IDs, so
  it will not clobber real users/posts created through the UI.
- **`SEED_RESET=1` (a.k.a. `--reset`)** additionally purges stale seed rows before
  re-seeding: everything owned by users with `@example.com` emails (resolved from
  the live DB, so rows from fixtures dropped in a newer seed are caught too), plus
  system digests. Data owned by non-seeded users and all topics are preserved, but
  posts created manually through a seeded demo account are removed. Use it when
  updated fixtures would otherwise leave old demo data behind. Combine with
  `SEED_ONLY` to scope it, and preview with `--reset --dry-run`.

## Scope

| Environment | Wrapper | Credentials source | k8s `get secret` needed? |
|---|---|---|---|
| **verita-dev** (Rancher) | `scripts/seed-rancher.sh` (npm: `seed:rancher`) | committed `values.yaml` dev defaults | **No** |
| **verita-prod** (Rancher production demo) | manual `Seed Rancher Production Demo` GitHub Actions workflow | GitHub Secrets | **No** |
| **Azure VM** (prod compose) | `scripts/seed-vm.sh` | the VM's own `.env` (via SSH) | n/a |

`verita-prod` is the production-configured demo deployment used for showcases
and reviews; it does not serve live customer data. Its seed path is deliberately
manual, main-only, all-domain, and upsert-only. It never runs as part of the prod
deployment workflow.

## verita-dev (Rancher)

Reaches the in-cluster ClusterIP Postgres + MinIO via `kubectl port-forward`,
then runs the seed with the committed dev credentials. Needs `kubectl` pointed at
the cluster and local `node`/`npm`. **No Secret access required.**

```bash
# from the repo root
npm run seed:rancher
# or a subset:
SEED_ONLY=users,content npm run seed:rancher
# purge stale seed rows first, then re-seed:
SEED_RESET=1 npm run seed:rancher
```

Local ports used while it runs: `5432` (user db), `5433` (content db), `5434`
(recommendation db), `9000` (MinIO). The port-forwards are torn down on exit.

Avatar/cover URLs are stored as `https://dev.verita.stud.k8s.aet.cit.tum.de/storage/...`
(the ingress `/storage` path), while uploads go through the port-forwarded MinIO
— the seed separates upload endpoint from public endpoint, so both are correct.

## verita-prod (Rancher production demo)

In GitHub, open **Actions → Seed Rancher Production Demo → Run workflow**. The
workflow has no inputs: it always checks out `main`, targets `verita-prod`, seeds
all domains in dependency order, and uses normal upserts. Concurrent prod seed
runs are serialized.

The GitHub-hosted runner uses the existing `KUBECONFIG` secret to port-forward
the three PostgreSQL services and MinIO. Database usernames remain the committed
service users (`svc_user`, `svc_content`, and `svc_recommendation`). The workflow
injects these existing GitHub Secrets without printing them:

- `USER_DB_PASSWORD`
- `CONTENT_DB_PASSWORD`
- `RECOMMENDATION_DB_PASSWORD`
- `USER_SERVICE_S3_SECRET_KEY`
- `CONTENT_SERVICE_S3_SECRET_KEY`

Before writing, the wrapper runs a mandatory full `--dry-run`. This authenticates
against all three databases, validates their seed schemas and fixture dependencies,
and checks access to both MinIO buckets. Only a successful preflight proceeds to
the full upsert. Prod mode rejects `SEED_ONLY` and `SEED_RESET`; stale-fixture
cleanup remains a separate, deliberate operation.

If the write phase fails after partially completing, do not try to roll it back.
Fix the reported connectivity or credential problem and manually rerun the workflow;
the deterministic upserts are designed for that recovery path.

## Azure VM (prod compose)

The VM publishes no DB/MinIO ports, so the seed runs **inside** the prod compose
network in a one-off `node:22-alpine` container. The wrapper ships the seed code
over SSH and reads credentials from the VM's `.env` (written by Ansible from the
GitHub secrets) — nothing secret is needed on your machine.

```bash
# VM_HOST = terraform output vm_public_ip
VM_HOST=<public-ip> ./scripts/seed-vm.sh
# subset:
VM_HOST=<public-ip> SEED_ONLY=users ./scripts/seed-vm.sh
# purge stale seed rows first, then re-seed:
VM_HOST=<public-ip> SEED_RESET=1 ./scripts/seed-vm.sh
```

Defaults (override via env): `VM_USER=azureuser`, `SSH_KEY=~/.ssh/verita_key`,
`DEPLOY_DIR=/home/azureuser/verita`. The compose network is auto-detected from
the running `user-db` container (override with `SEED_NETWORK`). `SEED_RESET`
purges stale seed rows before seeding (see *What it does / doesn't seed*).

## Troubleshooting

- **`schema is missing table(s)` / `Start service once so Flyway creates...`** —
  the target service hasn't booted and migrated yet. Make sure the stack is up
  and healthy, then re-run.
- **Avatars/images 404 in the browser** — the stored public URL doesn't match
  how MinIO is exposed. Check `INGRESS_HOST` (dev) or `STORAGE_S3_PUBLIC_ENDPOINT`
  in the VM `.env` points at the real `/storage` route.
- **dev: `connection refused`** — a port-forward didn't come up; verify the
  service names (`verita-{user,content,recommendation}-postgresql`, `verita-minio`)
  exist in the `verita-dev` namespace and your kube-context is correct.
- **prod: `Missing required production-demo credential`** — the named GitHub
  Secret is absent or empty. Add it under the repository's Actions secrets and
  rerun the manual workflow.
- **prod: dry-run failed** — no seed write was attempted. Use the named database,
  schema, or storage error to correct the deployment/secret wiring, then rerun.
- **prod: write failed after preflight** — the run may have updated earlier seed
  domains. Correct the failure and rerun the whole workflow; upserts reconcile it.
- **VM: `user-db container not found`** — the prod stack isn't running, or the
  compose project name differs; pass `SEED_NETWORK=<network>` explicitly.

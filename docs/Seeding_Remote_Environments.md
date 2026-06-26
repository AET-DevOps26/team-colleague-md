# Seeding Demo Data into Remote Environments

The seed script under [`scripts/seed/`](../scripts/seed) populates demo users,
posts, comments, votes, bookmarks and avatars. It is fully environment-agnostic
(everything is driven by env vars) and idempotent (upserts, safe to re-run). Out
of the box `npm run seed:local` targets a local `docker compose` stack; this doc
covers running the **same** script against the two remote demo environments.

> **No core changes.** These wrappers only add connectivity + credential wiring
> around the existing seed — the seed logic itself is untouched.

## What it does / doesn't seed

- **Topics already exist** in every environment — content-service's Flyway
  migration `V7__seed_topics.sql` seeds them on each deploy. The seed's topic
  upsert (`ON CONFLICT (name)`) is compatible with them.
- The DBs are otherwise **empty of users/posts** until seeded, so a freshly
  deployed environment shows an empty home feed. Run the seed to populate it.
- The seed only deletes the children of **its own** seed post IDs, so it will
  not clobber real users/posts created through the UI.

## Scope

| Environment | Wrapper | Credentials source | k8s `get secret` needed? |
|---|---|---|---|
| **verita-dev** (Rancher) | `scripts/seed-rancher.sh` (npm: `seed:rancher`) | committed `values.yaml` dev defaults | **No** |
| **Azure VM** (prod compose) | `scripts/seed-vm.sh` | the VM's own `.env` (via SSH) | n/a |
| **verita-prod** (Rancher) | — not supported — | real cluster Secrets | would be |

`verita-prod` is intentionally excluded: seeding real prod with demo data is
undesirable, and its credentials are only available as cluster Secrets the TUM
cluster may not let you read. If it is ever needed, do it with an **in-cluster
Job** that pulls credentials via `secretKeyRef` (so nobody reads the Secret) —
not with these runbook scripts.

## verita-dev (Rancher)

Reaches the in-cluster ClusterIP Postgres + MinIO via `kubectl port-forward`,
then runs the seed with the committed dev credentials. Needs `kubectl` pointed at
the cluster and local `node`/`npm`. **No Secret access required.**

```bash
# from the repo root
npm run seed:rancher
# or a subset:
SEED_ONLY=users,content npm run seed:rancher
```

Local ports used while it runs: `5432` (user db), `5433` (content db), `5434`
(recommendation db), `9000` (MinIO). The port-forwards are torn down on exit.

Avatar/cover URLs are stored as `https://dev.verita.stud.k8s.aet.cit.tum.de/storage/...`
(the ingress `/storage` path), while uploads go through the port-forwarded MinIO
— the seed separates upload endpoint from public endpoint, so both are correct.

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
```

Defaults (override via env): `VM_USER=azureuser`, `SSH_KEY=~/.ssh/verita_key`,
`DEPLOY_DIR=/home/azureuser/verita`. The compose network is auto-detected from
the running `user-db` container (override with `SEED_NETWORK`).

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
- **VM: `user-db container not found`** — the prod stack isn't running, or the
  compose project name differs; pass `SEED_NETWORK=<network>` explicitly.

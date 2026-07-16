# GenAI Environment Setup (Local Testing)

How to configure the GenAI service locally and test its features (post summary, daily digest,
LLM provider switching) through the **Admin panel**.

Related: [ADR-0020](../adr/0020-runtime-llm-selection-and-admin-ops.md) (runtime LLM selection and the admin GenAI-ops surface).

---

## 1. What you need

| Item | Required? | Where to get it |
|---|---|---|
| **NVIDIA NIM API key** | one of the two | <https://build.nvidia.com> → *Get API Key* (starts with `nvapi-`) |
| **Logos API key** (TUM) | one of the two | Handed out by the tutors (starts with `lg-`) |
| GNews API key | optional | <https://gnews.io> — extra news sources for the digest |
| GitHub token | optional | Raises GitHub API rate limits for digest sources |

You only need **one** LLM provider key to test everything. A provider **without a key is
unavailable**: it appears greyed out in the Admin panel and the backend rejects selecting it.

> **Logos only works inside the TUM network.** Off-campus you must be connected to **eduVPN**,
> otherwise every Logos call times out. NVIDIA works from anywhere on the public internet.

---

## 2. Configure the environment

The GenAI service reads its configuration from `genai-service/.env` (Docker Compose loads that
file into the container via `env_file`).

```bash
cd genai-service
cp .env.example .env
```

Then edit `.env`. Pick **one** of the two providers as the default:

**Option A — NVIDIA (no VPN needed):**

```dotenv
LLM_PROVIDER=nvidia
LLM_MODEL=nvidia/nemotron-3-super-120b-a12b
NVIDIA_NIM_API_KEY=nvapi-...

INTERNAL_SERVICE_TOKEN=dev-only-internal-service-token
```

**Option B — Logos (TUM network / eduVPN required):**

```dotenv
LLM_PROVIDER=logos
LLM_MODEL=openai/gpt-oss-120b
LOGOS_API_KEY=lg-...
LOGOS_BASE_URL=https://logos.aet.cit.tum.de:8080/v1

INTERNAL_SERVICE_TOKEN=dev-only-internal-service-token
```

Notes:
- The Logos model id includes the `openai/` prefix: `openai/gpt-oss-120b`.
- `INTERNAL_SERVICE_TOKEN` must be **identical** to the value used by the Spring services
  (the local Compose default is `dev-only-internal-service-token`). Content-service calls GenAI
  with this token; a mismatch gives `401` on every GenAI call.
- Never commit `.env` or paste a key into a document or a PR.

Optional, for richer digests:

```dotenv
GNEWS_API_KEY=...
GITHUB_TOKEN=...
```

Check your key works before starting the stack:

```bash
# Logos (must be on eduVPN)
curl https://logos.aet.cit.tum.de:8080/v1/models -H "Authorization: Bearer $LOGOS_API_KEY"
```

---

## 3. Start the stack and seed data

```bash
docker compose up --build          # from the repo root
npm run seed:local                 # demo users + posts (see scripts/seed-local.ts)
```

Verify GenAI is up:

```bash
curl http://localhost:8000/health
```

- Frontend: <http://localhost:3000>
- GenAI OpenAPI docs: <http://localhost:8000/docs>

---

## 4. Log in as an admin

The Admin panel requires a user with the `ADMIN` role. The seed data ships one:

| Field | Value |
|---|---|
| Email | `alex@example.com` |
| Password | `Password123!` |

Log in, then open **<http://localhost:3000/admin>** → **Operations** tab.

> The role travels in the JWT. If you promote a user to admin in the database, they must **log out
> and log in again** before the Admin panel appears.

---

## 5. Test the GenAI features from the Admin panel

### 5.1 Switch the LLM provider / model

In **Operations → GenAI configuration**:

1. Pick a provider from the dropdown. Providers with no API key are shown as *"no API key"* and
   cannot be selected.
2. Type or pick a model id (the field offers known-good suggestions per provider).
3. **Save**. The panel re-reads the live configuration, so what you see is what is running.

This override lives **in GenAI's memory only**. It resets to the `.env` default whenever the
GenAI container restarts — that is intentional (ADR-0020). `.env` is the baseline; the panel is
the runtime lever.

### 5.2 Re-run a post summary

Posts whose summary failed are listed under **Failed summaries**. Press **Re-summarize** (or paste
a post id) — the request returns immediately (`202`), the status turns `PENDING`, and the panel
polls until it becomes `COMPLETED` or `FAILED`.

A good end-to-end check: set a broken model id on purpose → re-summarize → it lands in `FAILED`;
set a valid model → re-summarize the same post → it becomes `COMPLETED`.

### 5.3 Generate a digest for a user

Under **Digest generation**:

1. Search for a user (e.g. `alexchen`).
2. Pick the **Platform Day** (defaults to yesterday — today's day is still collecting news).
3. Tick **force** to overwrite a digest that already exists for that day.
4. **Generate**. This is asynchronous (`202`) and can take a minute or more: it fetches external
   sources (Hugging Face, GNews, GitHub) and then calls the LLM. The panel polls and shows the
   final status.

Then open the user's digest page in the app to read the result.

---

## 6. Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| Provider shows *"no API key"* | The key is missing from `genai-service/.env`, or the container was not restarted after editing it: `docker compose up -d --build genai-service` |
| Every Logos call times out | You are off the TUM network — connect to **eduVPN** |
| `404 Function not found for account` (NVIDIA) | Your NVIDIA org may not call that model. Use one of the suggested model ids in the panel |
| GenAI calls return `401` | `INTERNAL_SERVICE_TOKEN` differs between GenAI and the Spring services |
| Admin panel is not visible after promoting a user | Log out and log in again — the role is a JWT claim |
| Digest completes but has few sources | `GNEWS_API_KEY` / `GITHUB_TOKEN` not set — the job warns and continues with fewer sources |
| Provider went back to the old value after a restart | Expected: the runtime override is in-memory only (ADR-0020) |

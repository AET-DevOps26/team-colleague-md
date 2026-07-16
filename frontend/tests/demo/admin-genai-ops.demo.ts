import { test, expect } from '@playwright/test';
import { beat, click, findPostIdByTitle, glideTo, SEED_USERS, startSignedIn, typeSlowly } from './support';

/**
 * admin-genai-ops — an admin changes the model behind the AI, then proves it took (ADR-0020, 0007).
 *
 * Aimed at a DevOps reviewer: the browser never talks to GenAI directly. Every action here goes to
 * content-service's admin-JWT front door, which forwards to GenAI over the internal-service-token
 * channel. Nothing else in the README makes that internal channel visible.
 *
 * The story has to close the loop — switch the provider, re-summarize a real post on the new model,
 * watch the job reach COMPLETED, then open the post and read the summary that just came back.
 * Showing only the config panel leaves a viewer with no evidence the switch did anything.
 *
 * The override is in-memory and resets when GenAI restarts (stateless by design), so this does not
 * linger on the switched state as though it were persisted.
 */

// Both providers are keyed in the local stack; nvidia is the one that is not the default, so
// picking it makes the change visible in `active:` rather than being a no-op.
const TARGET_PROVIDER = 'nvidia';
const TARGET_MODEL = 'meta/llama-3.3-70b-instruct';

const DEMO_POST = 'How I fine-tuned Llama 3 on 4 GPUs in under 6 hours';

test('admin-genai-ops', async ({ page }) => {
  await startSignedIn(page, SEED_USERS.alexchen); // seeded ADMIN
  const postId = await findPostIdByTitle(page, DEMO_POST);

  await click(page, page.locator('[data-testid="sidebar-admin"]'));
  await expect(page.locator('[data-testid="admin-page"]')).toBeVisible();
  await beat(page, 800);

  await click(page, page.locator('[data-testid="admin-tab-operations"]'));

  // The live config, read back through content-service from GenAI.
  const current = page.locator('[data-testid="admin-llm-current"]');
  await expect(current).toContainText('active:');
  await beat(page, 1400);

  /* ── 1. switch the model ── */

  // selectOption rather than a click-and-pick: a native <select> popup is drawn by the OS, not the
  // page, so the screencast would record an empty dropdown. The click is still worth making — the
  // ping lands on the control whose value is about to change.
  const providerSelect = page.locator('[data-testid="admin-llm-provider"]');
  await click(page, providerSelect);
  await providerSelect.selectOption(TARGET_PROVIDER);
  await beat(page, 900);

  // Typed rather than picked for the same reason: the datalist popup is native chrome too.
  await typeSlowly(page.locator('[data-testid="admin-llm-model"]'), TARGET_MODEL, 28);
  await beat(page, 700);

  await click(page, page.locator('[data-testid="admin-llm-save"]'));

  // The payoff for this half: `active:` re-reads from GenAI, so it changing is GenAI confirming it.
  await expect(current).toContainText(`active: ${TARGET_PROVIDER} / ${TARGET_MODEL}`);
  await beat(page, 1600);

  /* ── 2. re-summarize a real post on the new model ── */

  await typeSlowly(page.locator('[data-testid="admin-resummarize-input"]'), postId, 18);
  await beat(page, 600);

  await click(page, page.locator('[data-testid="admin-resummarize-submit"]'));

  // PENDING first: this is a real queued job against a real LLM, not an optimistic UI flip.
  const status = page.locator('[data-testid="admin-summary-status"]');
  await expect(status).toBeVisible();
  await beat(page, 1200);

  // The panel polls every 2s; a live model round trip can take most of a minute.
  await expect(status).toContainText('COMPLETED', { timeout: 120_000 });
  await beat(page, 1800);

  /* ── 3. read the result where a reader would ── */

  await page.goto(`/post/${postId}`);
  await expect(page.getByRole('heading', { name: DEMO_POST })).toBeVisible();
  await beat(page, 900);

  await glideTo(page, 'h1');
  await click(page, page.getByRole('button', { name: 'AI summary' }));

  // The summary on screen is the one the job just wrote, on the model chosen 30 seconds ago.
  await expect(page.getByText('Key points')).toBeVisible();
  await beat(page, 3200);
});

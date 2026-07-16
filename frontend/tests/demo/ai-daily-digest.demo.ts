import { test, expect } from '@playwright/test';
import { beat, click, startSignedIn } from './support';

/**
 * ai-daily-digest — the digest, Verita's most distinctive feature (ADR-0019).
 *
 * Signed in → /digest → the archive of past digests → open the reader's own → the generated
 * Markdown reads out, personalised from their topics and sourced from external content.
 */

test('ai-daily-digest', async ({ page }) => {
  await startSignedIn(page);

  await click(page, page.getByRole('link', { name: 'Digest' }).first());
  await expect(page).toHaveURL(/\/digest$/);

  // The archive: one digest per day, the reader's own badged Personalized against community ones.
  await expect(page.getByRole('heading', { name: 'Past digests' })).toBeVisible();
  await beat(page, 1600);
  await page.mouse.wheel(0, 260);
  await beat(page, 1200);
  await page.mouse.wheel(0, -260);
  await beat(page, 600);

  const ownDigest = page.getByRole('button', { name: /^Read digest for / }).filter({ hasText: 'Personalized' }).first();
  await click(page, ownDigest);
  await expect(page).toHaveURL(/\/digest\/[0-9a-f-]{36}$/);

  // The reader: badge, read time, and the personalisation note that explains where it came from.
  await expect(page.getByText('Verita AI Digest')).toBeVisible();
  await expect(page.getByText('Generated from your topics', { exact: false })).toBeVisible();
  await beat(page, 1800);

  // Read down through the generated Markdown — the substance is the body, not the header.
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 260);
    await beat(page, 700);
  }
  await beat(page, 1500);
});

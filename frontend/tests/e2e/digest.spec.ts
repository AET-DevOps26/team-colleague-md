import { test, expect } from '@playwright/test';
import { loginAs } from './support';

/**
 * US: Daily Digest (ADR-0019 — digest is a standalone entity; a PERSONAL digest for signed-in
 * users, a PUBLIC community digest for everyone else).
 */

test('DIG-1: a signed-in reader opens their personalised digest', async ({ page }) => {
  await loginAs(page);
  await page.goto('/digest');

  await expect(page.getByRole('heading', { name: 'Past digests' })).toBeVisible();

  // The reader's own digests are badged Personalized, against the community ones in the same list.
  const ownDigest = page.getByRole('button', { name: /^Read digest for / }).filter({ hasText: 'Personalized' }).first();
  await expect(ownDigest).toBeVisible();
  await ownDigest.click();

  await expect(page).toHaveURL(/\/digest\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Verita AI Digest')).toBeVisible();
  await expect(page.getByText('min read', { exact: false })).toBeVisible();
  await expect(page.getByText('Generated from your topics', { exact: false })).toBeVisible();
});

test('DIG-2: a visitor gets the public community digest plus a sign-in upsell', async ({ page }) => {
  await page.goto('/digest');

  await expect(page.getByText('Today ·', { exact: false })).toBeVisible();
  await expect(page.getByText('Your personalised digest awaits')).toBeVisible();

  await page.getByRole('button', { name: 'Read', exact: true }).click();

  await expect(page).toHaveURL(/\/digest\/[0-9a-f-]{36}$/);
  await expect(page.getByText('Verita Community Digest')).toBeVisible();
  // The visitor's reader upsells rather than claiming personalisation it cannot deliver.
  await expect(page.getByText('Get a digest built for you')).toBeVisible();
  await expect(page.getByText('Generated from your topics', { exact: false })).toHaveCount(0);
});

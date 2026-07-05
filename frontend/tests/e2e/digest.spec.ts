import { test, expect } from '@playwright/test';
import { loginAs } from './support';

test.describe('Digest — logged in (seeded personal digests)', () => {
  test('DIG-1: logged-in user sees today hero and past digests', async ({ page }) => {
    await loginAs(page);
    await page.goto('/digest');

    await expect(page.getByText('Today ·', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Read', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Past digests' })).toBeVisible();
  });

  test('DIG-2: opening the today digest renders the reader', async ({ page }) => {
    await loginAs(page);
    await page.goto('/digest');

    await page.getByRole('button', { name: 'Read', exact: true }).click();

    await expect(page).toHaveURL(/\/digest\/[0-9a-f-]{36}$/);
    await expect(page.getByText('Verita AI Digest')).toBeVisible();
    await expect(page.getByText('min read', { exact: false })).toBeVisible();
    // Save was removed (ADR-0019); a PERSONAL digest renders no bottom action bar.
    await expect(page.getByRole('button', { name: 'Save digest' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Share digest' })).toHaveCount(0);
  });

  test('DIG-3: reader shows the personalisation note when logged in', async ({ page }) => {
    await loginAs(page);
    await page.goto('/digest');
    await page.getByRole('button', { name: 'Read', exact: true }).click();

    await expect(page.getByText('Personalised from', { exact: false })).toBeVisible();
  });

  test('DIG-4: digest is a single past-digests view with no tab bar', async ({ page }) => {
    await loginAs(page);
    await page.goto('/digest');

    await expect(page.getByRole('heading', { name: 'Past digests' })).toBeVisible();
    // Topic management moved to the standalone Topic page (ADR-0014) — no tabs remain here.
    await expect(page.getByRole('tab', { name: 'Manage Topics' })).toHaveCount(0);
    await expect(page.getByPlaceholder('Filter topics…')).toHaveCount(0);
  });
});

test.describe('Digest — logged out (seeded public digest, ADR-0019)', () => {
  test('DIG-5: logged-out user sees the public today digest + sign-in hero', async ({ page }) => {
    await page.goto('/digest');

    await expect(page).toHaveURL('/digest');
    // Public "today" digest hero is readable without login.
    await expect(page.getByText('Today ·', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Read', exact: true })).toBeVisible();
    // Plus the auth upsell hero.
    await expect(page.getByText('Your personalised digest awaits')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('DIG-6: logged-out user can open the public digest reader with an auth upsell', async ({ page }) => {
    await page.goto('/digest');
    await page.getByRole('button', { name: 'Read', exact: true }).click();

    await expect(page).toHaveURL(/\/digest\/[0-9a-f-]{36}$/);
    // A PUBLIC digest reader is badged as the community digest (ADR-0019).
    await expect(page.getByText('Verita Community Digest')).toBeVisible();
    // Share is available on public digests; Save was removed.
    await expect(page.getByRole('button', { name: 'Share digest' })).toBeVisible();
    // Logged-out reader shows the auth upsell, not the personalisation note.
    await expect(page.getByText('Get a digest built for you')).toBeVisible();
    await expect(page.getByText('Personalised from', { exact: false })).toHaveCount(0);
  });
});

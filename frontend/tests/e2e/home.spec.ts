import { test, expect } from '@playwright/test';
import { loginAs, postCards } from './support';

/**
 * US: Home Feed — the feed renders real seeded posts and is the entry point to everything else.
 * Layout measurements and chip styling are not the story; navigating and engaging are.
 */

test('HOME-1: the feed renders seeded posts and a card opens its detail page', async ({ page }) => {
  await page.goto('/');

  const cards = postCards(page);
  await expect(cards.first()).toBeVisible();

  await cards.first().click();

  await expect(page).toHaveURL(/\/post\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('HOME-2: the feed is personalised once signed in', async ({ page }) => {
  await page.goto('/');
  // Wait for the feed shell before judging the banner — the banner's absence and a page that has
  // not rendered yet look identical.
  await expect(page.locator('[data-testid="topbar-topic-row"] button').first()).toHaveText('Trending');
  // Logged out: a community feed plus the sign-in upsell.
  await expect(page.locator('[data-testid="auth-banner"]')).toBeVisible();

  await loginAs(page);

  await expect(page.locator('[data-testid="auth-banner"]')).toBeHidden();
  await expect(page.locator('[data-testid="topbar-topic-row"] button').first()).toHaveText('For you');
  await expect(postCards(page).first()).toBeVisible();
});

test('HOME-3: searching from the topbar lands on filtered results', async ({ page }) => {
  await page.goto('/');

  await page.locator('[data-testid="topbar-search-row"] input[aria-label="Search"]').fill('transformers');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/search\?q=transformers/);
});

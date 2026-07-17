import { test, expect } from '@playwright/test';
import { loginAs, SEED_USERS, unique } from './support';

/**
 * US: Content Creation.
 *
 * Toolbar actions, validation and the exit guard are unit-tested. The flow worth a browser is the
 * one that crosses the network: an author writes Markdown, publishes, and the post is really there
 * on their profile afterwards.
 */

test('EDIT-1: an author can write a post, publish it, and find it on their profile', async ({ page }) => {
  await loginAs(page);
  const title = unique('E2E post');

  await page.getByRole('link', { name: 'New post' }).click();
  await expect(page).toHaveURL(/\/post\/new$/);

  await page.getByLabel('Post title').fill(title);
  await page.getByLabel('Post body').fill('A post written by the E2E suite.\n\nIt has two paragraphs.');

  await page.getByRole('button', { name: 'Publish' }).click();
  await page.getByRole('button', { name: 'Publish now' }).click();

  // Publishing leaves the editor for the new post's reader.
  await expect(page).toHaveURL(/\/post\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();

  await page.goto(`/profile/${SEED_USERS.alexchen.username}`);
  await expect(page.locator('[data-testid="posts-grid"]').getByText(title)).toBeVisible();
});

test('EDIT-2: the preview renders Markdown and KaTeX math as written', async ({ page }) => {
  await loginAs(page);

  await page.goto('/post/new');
  await page.getByLabel('Post title').fill(unique('E2E preview'));
  await page.getByLabel('Post body').fill('## Section heading\n\nInline math: $E = mc^2$\n');

  await page.getByRole('button', { name: 'Preview' }).click();

  await expect(page.getByRole('heading', { name: 'Section heading' })).toBeVisible();
  // KaTeX renders the formula into markup rather than leaving the raw $…$ source.
  await expect(page.locator('.katex').first()).toBeVisible();
});

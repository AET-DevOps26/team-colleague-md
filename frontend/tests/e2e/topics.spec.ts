import { test, expect } from '@playwright/test';
import { loginAs } from './support';

/**
 * US: Topic Management. Sorting and filtering the grid are unit-tested; what matters here is that
 * following a topic reaches user-service and comes back on the next read.
 */

test('TOPIC-1: following and unfollowing a topic persists across a refresh', async ({ page }) => {
  await loginAs(page);
  await page.goto('/topics');

  // Start from a followed topic and release it, so the test is not at the mercy of what an earlier
  // run left behind — following blind can hit the 10-topic cap and get a warning instead.
  // Follow state lives in the aria-label ("Follow Agents" → "Unfollow Agents"); the visible text is
  // only "Follow"/"Following".
  // "Unfollow all" is a bulk control, not a topic.
  const unfollowBtn = page.getByRole('button', { name: /^Unfollow (?!all\b)\S/ }).first();
  const topic = (await unfollowBtn.getAttribute('aria-label'))?.replace(/^Unfollow\s+/, '');
  expect(topic).toBeTruthy();

  await unfollowBtn.click();
  await expect(page.getByText(`Unfollowed #`, { exact: false })).toBeVisible();

  // A reload re-reads the follow set from user-service, so these are the writes, not local state.
  await page.reload();
  const followBtn = page.getByRole('button', { name: `Follow ${topic}`, exact: true });
  await expect(followBtn).toBeVisible();

  await followBtn.click();
  await expect(page.getByText(/Following #/)).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: `Unfollow ${topic}`, exact: true })).toBeVisible();
});

test('TOPIC-2: a visitor is asked to sign in before managing topics', async ({ page }) => {
  await page.goto('/topics');

  await expect(page.getByText('Follow the topics you care about')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
});

import { defineConfig, devices } from '@playwright/test';

// The same specs target any environment carrying the seed users: local compose by default, or a
// deployed one via BASE_URL (see docs/testing/Frontend_Testing.md).
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const isLocal = ['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname);

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/e2e/**/*.spec.ts'],
  workers: 1,
  retries: 1,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  // Only a localhost target needs a dev server started for it; a deployed environment already
  // serves its own frontend. Either way the suite drives the real app against a live, seeded
  // backend — assertions key off seed data, there is no in-app mock layer. Not run in CI (CI
  // keeps unit/component only).
  webServer: isLocal
    ? {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
      }
    : undefined,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/e2e/**/*.spec.ts', '**/api/**/*.spec.ts'],
  workers: 1,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // Demo build: posts/bookmarks/likes/drafts come from the in-app mock display layer
    // (ADR-0011), so E2E specs only need to mock the auth + profile endpoints.
    command: 'npm run dev:demo',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

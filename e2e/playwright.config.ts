import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for GESP Python Exam E2E tests.
 *
 * Base URL defaults:
 *   - Docker Compose: http://localhost:3002 (client served via nginx on port 3002)
 *   - Local dev:      http://localhost:5173 (Vite dev server)
 *
 * Override with E2E_BASE_URL environment variable.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['list']]
    : [['html', { open: 'on-failure' }], ['list']],

  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'auth',
      testDir: './tests',
      testMatch: 'auth.spec.ts',
      dependencies: [],
    },
    {
      name: 'authenticated',
      testDir: './tests',
      testMatch: '*.spec.ts',
      testIgnore: 'auth.spec.ts',
      dependencies: ['setup'],
      use: {
        storageState: '.auth/user.json',
      },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /no-files/, // placeholder so project is registered but doesn't run duplicate tests
    },
  ],
});

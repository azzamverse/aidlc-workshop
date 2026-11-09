import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const e2ePort = Number(process.env.E2E_PORT ?? 3100);

// The config loads again in each worker, so the database path chosen by the
// first load is kept in the environment and shared with the workers. A DB_FILE
// the caller sets (a parallel Bolt's own file) is used as given.
process.env.E2E_DB_FILE ??=
  process.env.DB_FILE ?? path.join(os.tmpdir(), `table-order-e2e-${e2ePort}-${Date.now()}.db`);

export default defineConfig({
  testDir: 'e2e',
  // Kept apart from test-results itself: Playwright empties this folder on each
  // run, and test-results also holds unit.json and the mockup-match screenshots.
  outputDir: 'test-results/playwright-artifacts',
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e.json' }]],
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${e2ePort}`,
    trace: 'retain-on-failure',
  },
  // Chromium, the installed Google Chrome and WebKit (NFR9). Firefox is not supported.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'google-chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    // WebKit's clicks and screenshots are slow on Windows, so each test gets longer overall.
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, timeout: 180_000 },
  ],
  webServer: {
    command: 'npm run build && node server/index.js',
    url: `http://localhost:${e2ePort}/api/menu`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORT: String(e2ePort),
      DB_FILE: process.env.E2E_DB_FILE,
      NODE_ENV: 'test',
    },
  },
});

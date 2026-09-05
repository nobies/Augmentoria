import { readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

// Keep infrastructure cookies private; never seed application data from a
// previous manual browser session into a test. No local server is started.
const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL || !baseURL.startsWith('https://')) {
  throw new Error('Set PLAYWRIGHT_BASE_URL to the HTTPS deployment being audited.');
}
const authFile = process.env.PLAYWRIGHT_AUTH_STATE;
const saved = authFile ? JSON.parse(readFileSync(authFile, 'utf8')) : null;

export default defineConfig({
  testDir: '.',
  testMatch: ['e2e/*.spec.ts', 'e2e-online/*.spec.ts'],
  workers: 1,
  retries: 0,
  timeout: 45_000,
  outputDir: 'test-results-online',
  reporter: [['list'], ['json', { outputFile: '.test-shots/online-results.json' }]],
  use: {
    baseURL,
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    storageState: saved ? { cookies: saved.cookies, origins: [] } : undefined,
    // Traces may contain share codes and infrastructure cookies. Keep all
    // artifacts ignored by Git and avoid capturing network payloads by default.
    trace: 'off',
    screenshot: 'only-on-failure',
  },
});

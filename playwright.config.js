import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: path.join(os.tmpdir(), '90skidbd-test-results'),
  use: { baseURL: 'http://localhost:4173' },
  projects: [
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: `npx wrangler dev --env test --port 4173 --ip 0.0.0.0 --persist-to ${path.join(os.tmpdir(), '90skidbd-wrangler')}`,
    url: 'http://127.0.0.1:4173',
    timeout: 120000,
    reuseExistingServer: true,
    stderr: 'ignore',
  },
});

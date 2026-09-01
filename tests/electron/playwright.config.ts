import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false, // Run Electron tests sequentially to avoid process resource contention
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: '../../test-results/results.json' }],
  ],
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  outputDir: '../../test-results',
});

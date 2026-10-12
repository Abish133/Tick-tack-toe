import { defineConfig } from '@playwright/test';
import fs from 'node:fs';

const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 12_000 },
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    headless: true,
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    launchOptions: fs.existsSync(chrome) ? { executablePath: chrome } : {},
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});

import { defineConfig, devices } from '@playwright/test'

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: externalBaseUrl ?? 'http://127.0.0.1:4173/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'npm run dev --workspace @poma/web -- --host 127.0.0.1 --port 4173',
        url: 'http://127.0.0.1:4173/',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
})


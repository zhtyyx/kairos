const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 15000,
  testMatch: '**/*.spec.js',
  use: {
    baseURL: 'http://127.0.0.1:8090',
    headless: true,
    launchOptions: process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {},
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run dev --workspace web -- --port 8090',
    url: 'http://127.0.0.1:8090',
    reuseExistingServer: !process.env.CI,
  },
});

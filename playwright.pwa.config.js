import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/pwa',
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5180', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run preview --workspace client -- --port 5180 --strictPort', url: 'http://127.0.0.1:5180', reuseExistingServer: false, timeout: 30000 },
})

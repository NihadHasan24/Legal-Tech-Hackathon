import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { defineConfig } from '@playwright/test'
import { testDatabase } from './tests/e2e/support.js'

if (existsSync('server/.env')) process.loadEnvFile('server/.env')
// Config is re-evaluated in each worker; keep the runner's DB name so server and test share one database.
if (!testDatabase.test(process.env.MONGODB_DB || '')) process.env.MONGODB_DB = `dlas_e2e_${randomBytes(6).toString('hex')}`
const databaseName = process.env.MONGODB_DB

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.js',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
  },
  webServer: [
    {
      command: 'npm run start --workspace server',
      url: 'http://127.0.0.1:5001/health',
      // Live AI stays off in browser tests: no paid calls, and the fallback path is what gets exercised.
      env: { PORT: '5001', MONGODB_DB: databaseName, VOICE_AI: 'off' },
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'npm run dev --workspace client -- --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174',
      env: { VITE_API_TARGET: 'http://127.0.0.1:5001' },
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
})

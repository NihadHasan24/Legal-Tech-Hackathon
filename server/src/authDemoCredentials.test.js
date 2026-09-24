import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getDemoCredentials } from './services/authService.js'

test('demo login credentials are production-disabled and role-allowlisted', async () => {
  const originalEnvironment = process.env.NODE_ENV
  try {
    process.env.NODE_ENV = 'production'
    await assert.rejects(getDemoCredentials('DLAO_OFFICER'), (error) => error.code === 'DEMO_AUTH_DISABLED')

    process.env.NODE_ENV = 'development'
    await assert.rejects(getDemoCredentials('INVALID_ROLE'), (error) => error.code === 'DEMO_ACCOUNT_NOT_FOUND')
  } finally {
    if (originalEnvironment === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalEnvironment
  }
})

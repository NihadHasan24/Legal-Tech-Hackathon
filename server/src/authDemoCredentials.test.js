import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ensureAdminUser, getDemoCredentials } from './services/authService.js'

test('demo login credentials are production-disabled and role-allowlisted', async () => {
  const originalEnvironment = process.env.NODE_ENV
  const originalAdminPassword = process.env.ADMIN_PASSWORD
  try {
    process.env.NODE_ENV = 'production'
    await assert.rejects(getDemoCredentials('DLAO_OFFICER'), (error) => error.code === 'DEMO_AUTH_DISABLED')
    delete process.env.ADMIN_PASSWORD
    assert.equal(await ensureAdminUser(), null, 'production never creates admin.com with the known default password')

    process.env.NODE_ENV = 'development'
    await assert.rejects(getDemoCredentials('INVALID_ROLE'), (error) => error.code === 'DEMO_ACCOUNT_NOT_FOUND')
  } finally {
    if (originalAdminPassword !== undefined) process.env.ADMIN_PASSWORD = originalAdminPassword
    if (originalEnvironment === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalEnvironment
  }
})

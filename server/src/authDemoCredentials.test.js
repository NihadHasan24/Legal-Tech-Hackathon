import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getDemoCredentials } from './services/authService.js'

test('demo login credentials are production-disabled and role-allowlisted', async () => {
  const originalEnvironment = process.env.NODE_ENV
  try {
    process.env.NODE_ENV = 'production'
    await assert.rejects(getDemoCredentials('DLAO_OFFICER'), (error) => error.code === 'DEMO_AUTH_DISABLED')

    process.env.DEMO_CREDENTIALS = JSON.stringify({ 'demo.officer': 'fictional-officer-pass' })
    assert.deepEqual(await getDemoCredentials('DLAO_OFFICER'), { username: 'demo.officer', password: 'fictional-officer-pass' })
    await assert.rejects(getDemoCredentials('UDC_OPERATOR'), (error) => error.code === 'DEMO_ACCOUNTS_NOT_SEEDED')
    delete process.env.DEMO_CREDENTIALS

    process.env.NODE_ENV = 'development'
    await assert.rejects(getDemoCredentials('CLAO'), (error) => error.code === 'DEMO_ACCOUNT_NOT_FOUND')
  } finally {
    if (originalEnvironment === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalEnvironment
  }
})

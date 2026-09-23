import assert from 'node:assert/strict'
import test from 'node:test'
import { limitPublic } from './rateLimit.js'

test('public limiter bounds per-IP memory and evicts the oldest bucket', () => {
  const limit = limitPublic(1)
  const allowed = (ip) => {
    let passed = false
    try { limit({ ip }, {}, () => { passed = true }) } catch (error) { assert.equal(error.status, 429) }
    return passed
  }

  assert.equal(allowed('first-ip'), true)
  for (let index = 1; index < 4096; index += 1) assert.equal(allowed(`ip-${index}`), true)
  assert.equal(allowed('new-ip'), true)
  assert.equal(allowed('first-ip'), true)
})

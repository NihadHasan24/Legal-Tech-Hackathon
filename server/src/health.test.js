import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { after, test } from 'node:test'
import app from './app.js'

const server = createServer(app)
after(() => {
  server.closeAllConnections()
  server.close()
})

test('health reports unavailable when MongoDB is disconnected', async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const response = await fetch(`http://127.0.0.1:${address.port}/health`)
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { status: 'unavailable', database: 'disconnected' })
})

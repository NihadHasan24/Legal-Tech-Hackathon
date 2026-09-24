import assert from 'node:assert/strict'
import { after, test } from 'node:test'

process.env.NODE_ENV = 'production'
delete process.env.STAFF_LOGIN_ENABLED
const { default: app } = await import('./app.js')

const server = app.listen(0, '127.0.0.1')
await new Promise((resolve) => server.once('listening', resolve))
const origin = `http://127.0.0.1:${server.address().port}`

after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))

test('production serves the PWA shell while preserving API and health responses', async () => {
  const home = await fetch(origin, { headers: { accept: 'text/html' } })
  const html = await home.text()
  assert.equal(home.status, 200)
  assert.match(home.headers.get('content-security-policy'), /script-src 'self'/)
  assert.match(home.headers.get('content-security-policy'), /media-src 'self' blob:/)
  assert.equal(home.headers.get('access-control-allow-origin'), null)

  const scriptPath = html.match(/<script\b[^>]*src="([^"]+)"/)?.[1]
  assert.ok(scriptPath, 'production HTML must reference a built JavaScript asset')
  const script = await fetch(new URL(scriptPath, origin))
  assert.equal(script.status, 200)
  assert.match(script.headers.get('content-security-policy'), /default-src 'self'/)

  for (const path of ['/manifest.webmanifest', '/sw.js']) {
    const asset = await fetch(`${origin}${path}`)
    assert.equal(asset.status, 200, `${path} must be served in production`)
    assert.match(asset.headers.get('content-security-policy'), /default-src 'self'/)
  }

  const route = await fetch(`${origin}/voice`, { headers: { accept: 'text/html' } })
  assert.equal(route.status, 200)
  assert.match(await route.text(), /<div id="root"><\/div>/)

  const login = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'demo-user', password: 'not-a-real-password' }),
  })
  assert.equal(login.status, 503)
  assert.equal((await login.json()).error.code, 'DEMO_AUTH_DISABLED')
  assert.equal(login.headers.get('cache-control'), 'no-store')

  const missingApi = await fetch(`${origin}/api/unknown`, { headers: { accept: 'text/html' } })
  assert.equal(missingApi.status, 401)
  assert.match(missingApi.headers.get('content-type'), /application\/json/)
  assert.match(missingApi.headers.get('content-security-policy'), /default-src 'none'/)

  const missingHealthRoute = await fetch(`${origin}/health/unknown`, { headers: { accept: 'text/html' } })
  assert.equal(missingHealthRoute.status, 404)
  assert.match(missingHealthRoute.headers.get('content-type'), /application\/json/)
})

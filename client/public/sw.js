const CACHE = 'dlas-static-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/dlas-192.svg', '/icons/dlas-512.svg']

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    await cache.addAll(SHELL)
    // ponytail: parse Vite's built index for hashed assets; use a generated precache manifest if the output format changes.
    const html = await (await fetch('/index.html', { cache: 'no-store' })).text()
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map((match) => match[1])
    await cache.addAll(assets)
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname === '/health') return
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')))
    return
  }
  if (!url.pathname.startsWith('/assets/') && !SHELL.includes(url.pathname)) return
  event.respondWith(caches.match(url.pathname, { ignoreVary: true }).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()))
    return response
  })))
})

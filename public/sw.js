const CACHE_NAME = 'vcr-app-v3'
// /app is the installed app's start_url (manifest.webmanifest); it routes each
// user to their portal, so it is the shell to fall back to offline.
const PRECACHE_URLS = ['/app', '/admin']

// Pages that belong to the app. Keep in sync with src/lib/appRoutes.js.
const APP_PREFIXES = ['/admin', '/my', '/login', '/agent', '/app']
const isAppPath = (pathname) =>
  APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
// Vite's hashed build output: safe to serve cache-first forever.
const isBuildAsset = (pathname) => pathname.startsWith('/assets/')

// Install: precache the dashboard shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// Activate: delete old versioned caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Registered at scope "/", so this sees marketing pages too: leave them
  // alone. Previously only /admin paths were handled, which also skipped the
  // /assets/* JS and CSS the dashboard needs, so it never worked offline.
  if (!isAppPath(url.pathname) && !isBuildAsset(url.pathname)) {
    return
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return
  }

  // Never cache Supabase API calls — always go to network
  if (url.hostname.includes('supabase.co')) {
    return
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Navigation requests (HTML) — network-first, cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match('/app'))
        )
    )
    return
  }

  // Only cache same-origin static assets (JS, CSS, images, fonts)
  if (url.origin !== self.location.origin) {
    return
  }

  // Static assets — cache-first, network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        const isCacheable =
          response.ok &&
          response.status === 200 &&
          !response.headers.has('content-range')

        if (isCacheable) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      }).catch(() => new Response(null, { status: 504, statusText: 'Gateway Timeout' }))
    })
  )
})

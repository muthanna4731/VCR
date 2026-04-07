const CACHE_NAME = 'vcr-dash-v2'
const PRECACHE_URLS = ['/admin']

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

  if (!url.pathname.startsWith('/admin')) {
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
          caches.match(event.request).then((cached) => cached || caches.match('/admin'))
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

// Service Worker — cache-first for static assets, network-first for API calls
const CACHE_NAME = 'planner-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Install: pre-cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignore errors on individual resources during install
      })
    })
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: strategy based on request type
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Network-first for Supabase API calls
  if (url.hostname.includes('supabase')) {
    event.respondWith(networkFirst(request))
    return
  }

  // Cache-first for static assets (JS, CSS, fonts, images)
  if (
    request.method === 'GET' &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg'))
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Network-first for everything else (HTML navigation etc.)
  event.respondWith(networkFirst(request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    // Offline fallback for navigation
    if (request.mode === 'navigate') {
      const indexCache = await caches.match('/index.html')
      if (indexCache) return indexCache
    }
    return new Response('오프라인 상태입니다', { status: 503 })
  }
}

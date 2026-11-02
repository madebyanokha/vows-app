/* Service worker template — vite.config.ts fills in the version and file list at build time. */
const VERSION = '1fd95f413fcc'
const PRECACHE = ["assets/index-BT1t8Mhn.css","assets/index-C2CtMExN.js","favicon.svg","icons/icon-180.png","icons/icon-192.png","icons/icon-512.png","icons/icon.svg","images/inspiration/dessert-table.jpg","images/inspiration/lehenga.jpg","images/themes/christian/accent.jpg","images/themes/christian/hero.jpg","images/themes/classic/accent.jpg","images/themes/classic/hero.jpg","images/themes/hindu/accent.jpg","images/themes/hindu/hero.jpg","index.html","manifest.webmanifest"]
const APP_CACHE = `vows-app-${VERSION}`
const FONT_CACHE = 'vows-fonts'
const scoped = (path) => new URL(path, self.registration.scope).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(PRECACHE.map(scoped)))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('vows-app-') && k !== APP_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

/** Try the network for pages so updates arrive promptly; fall back to the saved app when offline. */
async function page(request) {
  const cache = await caches.open(APP_CACHE)
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
    ])
    if (response.ok) return response
  } catch {
    // Offline or slow — use the saved copy.
  }
  return (await cache.match(scoped('index.html'))) ?? fetch(request)
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone())
  return response
}

/** Serve fonts instantly from the cache and refresh them in the background. */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(FONT_CACHE)
  const hit = await cache.match(request)
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone())
      return response
    })
    .catch(() => hit)
  return hit ?? refresh
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request))
  } else if (url.origin === self.location.origin) {
    event.respondWith(request.mode === 'navigate' ? page(request) : cacheFirst(request, APP_CACHE))
  }
})

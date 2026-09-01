const CACHE = 'alany-admin-v2'
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/lib/config.js',
  './js/lib/supabase.js',
  './js/lib/auth.js',
  './js/lib/utils.js',
  './js/lib/cloudinary.js',
  './js/lib/icons.js',
  './js/lib/pwa.js',
  './js/modules/welcome.js',
  './js/modules/login.js',
  './js/modules/register.js',
  './js/modules/dashboard.js',
  './js/modules/products.js',
  './js/modules/nav.js',
  './js/modules/placeholder.js',
  './js/modules/developer.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/logo.jpg',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (url.origin !== location.origin) return
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached ||
      fetch(e.request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, copy))
          return res
        })
        .catch(() => cached)
    )
  )
})

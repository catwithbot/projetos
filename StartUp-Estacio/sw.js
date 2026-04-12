/**
 * sw.js — AcolheMais 2.0 Service Worker
 * ─────────────────────────────────────────────────────────────────
 * Strategy:
 *   • HTML pages       → Network-first  (always try fresh, fallback to cache)
 *   • CSS / JS assets  → Cache-first    (stable; skip network once cached)
 *   • Google Fonts     → Cache-first    (immutable content-addressed URLs)
 *   • Other external   → Network-only   (skip cache)
 * ─────────────────────────────────────────────────────────────────
 */

const CACHE_NAME   = 'acolhemais-v1';
const FONTS_CACHE  = 'acolhemais-fonts-v1';

/** All local assets pre-cached on install */
const PRECACHE_ASSETS = [
  '/index.html',
  '/acesso.html',
  '/jornada.html',
  '/mente-corpo.html',
  '/manifest.json',
  '/css/design-system.css',
  '/css/style.css',
  '/css/nav-bottom.css',
  '/css/acesso.css',
  '/css/jornada.css',
  '/css/mente-corpo.css',
  '/js/main.js',
  '/js/nav-loader.js',
  '/js/acesso.js',
  '/js/jornada.js',
  '/js/mente-corpo.js',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

/* ── Install: pre-cache static shell ──────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: purge stale caches ────────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== FONTS_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: route by resource type ───────────────────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Google Fonts → cache-first
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirst(request, FONTS_CACHE));
    return;
  }

  // External origins (CDNs, etc.) → network-only, don't cache
  if (url.origin !== self.location.origin) return;

  // HTML pages → network-first
  const acceptHeader = request.headers.get('accept') ?? '';
  if (acceptHeader.includes('text/html') || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Same-origin static assets (CSS, JS, SVG, icons) → cache-first
  event.respondWith(cacheFirst(request, CACHE_NAME));
});


/* ── Strategy helpers ────────────────────────────────────────── */

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    return cached ?? offlineFallback();
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return offlineFallback();
  }
}

function offlineFallback() {
  return new Response(
    `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AcolheMais — Offline</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #1A2332; color: #F0F4F8;
           display: flex; flex-direction: column; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 2rem; }
    h1   { font-size: 2rem; margin-bottom: .5rem; }
    p    { color: #A8B8CC; }
    a    { color: #1D9E75; }
  </style>
</head>
<body>
  <h1>Você está offline</h1>
  <p>Verifique sua conexão e tente novamente.</p>
  <p><a href="/index.html">Tentar novamente</a></p>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

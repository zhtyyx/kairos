const CACHE_NAME = 'kairos-shell-__BUILD_ID__';
const CORE_ASSETS = __PRECACHE_ASSETS__;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('kairos-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search || url.pathname.startsWith('/api/')) return;
  const isApp = request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/app' || url.pathname.startsWith('/app/'));
  if (!isApp && !CORE_ASSETS.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cached = await caches.match(isApp ? '/index.html' : url.pathname);
    if (!isApp && cached) return cached;
    try { return await fetch(request); }
    catch { return cached || new Response('Offline', { status: 503 }); }
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('kairos-shell-')).map(key => caches.delete(key)))));
});

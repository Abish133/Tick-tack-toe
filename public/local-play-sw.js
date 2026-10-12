const CACHE = 'elemental-arena-local-classic-v1';
const PAGE = '/local-play';
const allowedAsset = url => url.origin === self.location.origin && (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/assets/') || url.pathname === '/favicon.svg');
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith('elemental-arena-local-classic-') && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_LOCAL_PLAY') return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      const response = await fetch(PAGE, { cache: 'reload', credentials: 'omit' });
      if (!response.ok) throw new Error('Local page unavailable.');
      const html = await response.clone().text();
      const embedded = [...html.matchAll(/(?:src|href)="([^"\s]+)"/g)].map(match => match[1]);
      const assets = [...new Set([...(event.data.resources || []), ...embedded, '/assets/arena.png', '/assets/avatar-void.png', '/favicon.svg'])].map(value => new URL(value, self.location.origin)).filter(allowedAsset).slice(0, 200);
      const results = await Promise.allSettled(assets.map(async url => { const result = await fetch(url.href, { cache: 'reload', credentials: 'omit' }); if (!result.ok) throw new Error('Asset unavailable.'); await cache.put(url.href, result); }));
      await cache.put(PAGE, response);
      const keys = await cache.keys();
      for (const key of keys.slice(0, Math.max(0, keys.length - 250))) if (new URL(key.url).pathname !== PAGE) await cache.delete(key);
      event.ports[0]?.postMessage({ ready: results.every(result => result.status === 'fulfilled') });
    } catch { event.ports[0]?.postMessage({ ready: false }); }
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && url.pathname === PAGE) {
    event.respondWith((async () => { const cache = await caches.open(CACHE); try { const response = await fetch(new Request(request, { credentials: 'omit' })); if (response.ok) await cache.put(PAGE, response.clone()); return response; } catch { return await cache.match(PAGE) || Response.error(); } })());
  } else if (allowedAsset(url)) {
    event.respondWith((async () => { const cache = await caches.open(CACHE); const saved = await cache.match(request); if (saved) return saved; const response = await fetch(new Request(request, { credentials: 'omit' })); if (response.ok) await cache.put(request, response.clone()); return response; })());
  }
});

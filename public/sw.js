/* ریاضی‌یار ششم — Service Worker ساده برای استفاده آفلاین
   راهبرد: Cache-First برای درخواست‌های GET هم‌مبدأ؛ درخواست‌های خارجی (نداریم) و متدهای دیگر رد می‌شوند. */
const CACHE_NAME = 'ryaziyarsix-v4-design';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone()).catch(() => undefined);
        }
        return res;
      } catch {
        // در حالت آفلاین، اگر صفحه اصلی خواسته شده بود، نسخه کش‌شده را برگردان
        const shell = await caches.match(new Request('./'));
        return shell ?? Response.error();
      }
    })()
  );
});

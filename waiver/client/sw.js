const cacheName = "BUILD_CACHE";
const paths = "BUILD_PATHS";
self.addEventListener("install", (e) =>
  e.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      await cache.addAll(paths.map((p) => new Request(p, { cache: "reload" })));
      await self.skipWaiting();
    })(),
  ),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("mh-waiver-") && key !== cacheName)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const req = event.request,
    url = new URL(req.url);
  if (
    req.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.search ||
    url.pathname.startsWith("/api/")
  )
    return;
  const key = url.pathname === "/index.html" ? "/" : url.pathname.replace(/\.html$/, "");
  if (paths.includes(key))
    event.respondWith(
      caches
        .open(cacheName)
        .then(async (cache) => (await cache.match(key)) || fetch(req)),
    );
});

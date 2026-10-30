const SHELL_CACHE = "rowell-hub-shell-v2";
const OWN_CACHE_PREFIX = "rowell-hub-shell-";
const SHELL_FILES = ["/offline.html", "/icons/app-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(OWN_CACHE_PREFIX) && key !== SHELL_CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (!url.search && SHELL_FILES.includes(url.pathname)) {
    event.respondWith(caches.open(SHELL_CACHE).then(async (cache) => (await cache.match(url.pathname)) || fetch(request)));
    return;
  }
  if (request.mode !== "navigate") return;
  if (url.pathname === "/api" || url.pathname.startsWith("/api/") || url.pathname === "/download" || url.pathname.startsWith("/download/")) return;

  event.respondWith((async () => {
    try {
      return await fetch(request, { cache: "no-store" });
    } catch {
      const fallback = await (await caches.open(SHELL_CACHE)).match("/offline.html");
      return new Response(fallback ? await fallback.text() : "You’re offline. Reconnect and try again.", {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
  })());
});

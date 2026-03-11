const CACHE_NAME = "Leonardosutello2026";

const FILES_TO_CACHE = [
  "/App/",
  "/App/index.html",
  "/App/style.css",
  "/App/app.js",
  "/App/manifest.json",
  "/App/icon-192.png",
  "/App/icon-512.png"
];

// Instala e salva cache
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => key !== CACHE_NAME && caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Intercepta requisições com estratégia Network First para o index
self.addEventListener("fetch", event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});
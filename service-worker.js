const CACHE_NAME = "AtualizarApp_v2"; // Mude o nome para forçar a detecção agora

const FILES_TO_CACHE = [
  "/App/",
  "/App/index.html",
  "/App/style.css",
  "/App/app.js",
  "/App/manifest.json"
];

// Instala e salva cache
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  // REMOVIDO o self.skipWaiting() daqui para o modal funcionar!
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

// Intercepta requisições
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// Escuta o comando do botão "SIM" do seu modal
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

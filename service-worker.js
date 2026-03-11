const CACHE_NAME = "AtualizarAppv16"; // MUDAR AQUI SEMPRE QUE ATUALIZAR O APP

const FILES_TO_CACHE = [
  "/App/",
  "/App/index.html",
  "/App/style.css",
  "/App/app.js",
  "/App/manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// Escuta a mensagem para pular a espera (adicione isso no fim do service-worker.js)
self.addEventListener('message', (event) => {
  // Ajustado para aceitar objeto ou string direta
  const type = event.data && event.data.type ? event.data.type : event.data;
  
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

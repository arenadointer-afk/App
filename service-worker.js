/* === MOTOR DE NOTIFICAÇÕES (FICA ACORDADO EM SEGUNDO PLANO) === */
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDDguzJOP5GKqlqf8GW-xdsTCxh1Ha7C7k",
    authDomain: "sutello-financeiro.firebaseapp.com",
    projectId: "sutello-financeiro",
    storageBucket: "sutello-financeiro.firebasestorage.app",
    messagingSenderId: "460447549653",
    appId: "1:460447549653:web:a36b0c7d2c2919ff633a5c"
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
    const titulo = payload.notification.title;
    const opcoes = {
        body: payload.notification.body,
        icon: '/App/icon-192.png',
        badge: '/App/icon-192.png'
    };
    self.registration.showNotification(titulo, opcoes);
});

/* === SISTEMA DE CACHE E OFFLINE PWA === */
const CACHE_NAME = "Sutello-Financeiro-V4";

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

// Intercepta requisições (offline)
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
        // Retorna o arquivo salvo na memória, ou busca na internet se não tiver
        return response || fetch(event.request);
    })
  );
});
    

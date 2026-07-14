const CACHE_NAME = "lumen-caja-v7";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Trafico propio de Firebase (Auth/Firestore/Cloud Functions): no interceptar,
  // que el navegador y el SDK de Firebase lo manejen directamente (tienen su propia
  // logica de reintentos y cola offline).
  if (
    url.hostname.endsWith("googleapis.com") ||
    url.hostname.endsWith("firebaseio.com") ||
    url.hostname.endsWith("firebaseapp.com") ||
    url.hostname.endsWith("cloudfunctions.net")
  ) {
    return;
  }

  // SDK de Firebase servido desde gstatic: es estatico y versionado, cache-first
  // para que la app pueda arrancar sin internet aunque el navegador haya borrado su cache HTTP.
  if (url.hostname === "www.gstatic.com") {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
    return;
  }

  // Otros origenes externos (ej. tasa BCV): siempre intentar en vivo primero.
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // Archivos propios de la app: cache-first para que funcione offline.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

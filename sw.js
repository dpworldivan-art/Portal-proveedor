/* Service worker: guarda la interfaz (HTML, CSS, JS, iconos) para que abra al instante y funcione aunque la señal sea mala.
 * Los DATOS nunca se guardan aquí: las llamadas a Apps Script (POST) van siempre a la red.
 * Al publicar una versión nueva, sube el número de VERSION para que los teléfonos descarguen los archivos nuevos. */
const VERSION = 'ecosac-pwa-1.1.0';
const BASE = ['./', 'index.html', 'css/estilos.css', 'js/config.js', 'js/qr.js', 'js/portal.js', 'js/unidades.js', 'js/resumen.js', 'js/contactos.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Interfaz: se muestra lo guardado y se actualiza en segundo plano (la próxima apertura ya trae lo nuevo).
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const guardado = await c.match(r, { ignoreSearch: true });
    const red = fetch(r).then(x => { if (x && x.ok) c.put(r, x.clone()); return x; }).catch(() => guardado);
    return guardado || red;
  }));
});

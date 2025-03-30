// js/sw.js - Service Worker para Progressive Web App (PWA)

// Nombre único para la caché de esta versión de la app
const CACHE_NAME = 'parkeosv-osm-cache-v3'; // Incrementar versión si cambias archivos cacheados
// URL de la API que NO queremos cachear
const OVERPASS_API_URL = "https://overpass-api.de/api/interpreter";

// Lista de recursos estáticos a cachear durante la instalación
// Incluye HTML, CSS, JS (incluyendo Leaflet local), imágenes de iconos, fuentes, etc.
const urlsToCache = [
  '/parkeosv/', // Ruta raíz
  '/parkeosv/index.html', // Página principal
  '/parkeosv/css/style.css', // CSS principal
  '/parkeosv/css/leaflet.css', // CSS de Leaflet
  '/parkeosv/js/main.js', // Lógica principal
  '/parkeosv/js/leaflet-map.js', // Lógica del mapa
  '/parkeosv/js/haversine.js', // Cálculo de distancia
  '/parkeosv/js/leaflet.js', // Librería Leaflet
  // URLs de iconos personalizados usados en leaflet-map.js (opcional, pero bueno para offline)
  'https://cdn.jsdelivr.net/npm/@mapicons/classic@1.0.3/icons/parking_lot.png',
  'https://cdn.jsdelivr.net/npm/@mapicons/classic@1.0.3/icons/location_marker.png',
  // Iconos PWA (usando placeholders, idealmente serían locales)
  'https://placehold.co/192x192/4A90E2/FFFFFF/png?text=P',
  'https://placehold.co/512x512/4A90E2/FFFFFF/png?text=P',
  // Fuente de Google Fonts
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap',
  // Archivo real de la fuente (woff2) - opcional, requiere obtener URL exacta
  // 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff2'
];

// Evento 'install': Se dispara cuando el SW se registra por primera vez o se actualiza.
self.addEventListener('install', event => {
  console.log(`SW: Instalando ${CACHE_NAME}...`);
  // waitUntil asegura que la instalación no termine hasta que la promesa se resuelva.
  event.waitUntil(
    // Abrir (o crear) la caché especificada.
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Cache abierto, añadiendo archivos principales.');
        // Intentar añadir todos los archivos a la caché.
        // Usar Promise.all para intentar cachear todo, incluso si alguno falla individualmente.
        return Promise.all(
           urlsToCache.map(url => {
               // cache.add() hace fetch y guarda la respuesta.
               return cache.add(url).catch(err => {
                   // Advertir si un recurso específico no se pudo cachear (ej. fuente offline)
                   console.warn(`SW: Fallo al cachear ${url}`, err);
               });
           })
        );
      })
      .then(() => {
        console.log('SW: Archivos principales intentados.');
        // Forzar al nuevo SW a activarse inmediatamente después de la instalación.
        return self.skipWaiting();
      })
      .catch(error => {
        // Capturar error grave durante la apertura o cacheo inicial.
        console.error('SW: Fallo en instalación.', error);
      })
  );
});

// Evento 'activate': Se dispara después de 'install' cuando el SW toma control.
// Ideal para limpiar caches antiguas.
self.addEventListener('activate', event => {
  console.log(`SW: Activado ${CACHE_NAME}.`);
  event.waitUntil(
    // Obtener los nombres de todas las caches existentes.
    caches.keys().then(cacheNames => {
      // Devolver una promesa que se resuelve cuando todas las caches viejas se borraron.
      return Promise.all(
        cacheNames.map(cache => {
          // Si el nombre de la cache no es el actual, borrarla.
          if (cache !== CACHE_NAME) {
            console.log('SW: Borrando cache antigua:', cache);
            return caches.delete(cache);
          }
          return null; // No hacer nada si es la cache actual
        })
      );
    }).then(() => {
        console.log('SW: Reclamando control de clientes...');
        // Asegurar que el SW controle todas las pestañas abiertas de la app inmediatamente.
        return self.clients.claim();
    })
  );
});

// Evento 'fetch': Se dispara cada vez que la página (o el SW) solicita un recurso (CSS, JS, img, API).
self.addEventListener('fetch', event => {
  // IGNORAR las peticiones a la API Overpass - Siempre deben ir a la red.
  if (event.request.url.startsWith(OVERPASS_API_URL)) {
    // No llamar a event.respondWith() deja que el navegador maneje la petición normalmente.
    // console.log('SW: Petición a Overpass, ignorando caché.');
    return;
  }

  // Para otros recursos, aplicar estrategia "Cache First, then Network".
  event.respondWith(
    // 1. Intentar encontrar el recurso en la caché.
    caches.match(event.request)
      .then(response => {
        // 2. Si se encuentra en caché (response existe), devolverlo.
        if (response) {
          // console.log('SW: Sirviendo desde cache:', event.request.url);
          return response;
        }

        // 3. Si no está en caché, ir a la red.
        // console.log('SW: No en cache, solicitando a la red:', event.request.url);
        return fetch(event.request)
          .then(networkResponse => {
            // 4. (Opcional) Si la respuesta de red es válida, cachearla para futuras peticiones.
            //    Solo cachear respuestas OK (status 200), método GET, y evitar extensiones de chrome.
            if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET' && !event.request.url.startsWith('chrome-extension://')) {
               // Clonar la respuesta porque solo se puede consumir una vez.
               const responseToCache = networkResponse.clone();
               // Abrir la caché y guardar la respuesta clonada.
               caches.open(CACHE_NAME)
                 .then(cache => {
                   // console.log('SW: Cacheando nueva respuesta de red:', event.request.url);
                   cache.put(event.request, responseToCache);
                 });
            }
            // Devolver la respuesta original de la red a la página.
            return networkResponse;
          })
          .catch(error => {
              // 5. Manejar error si falla la red Y no estaba en caché.
              console.error('SW: Fallo fetch (no en cache):', event.request.url, error);
              // Aquí podrías devolver una respuesta offline genérica si tuvieras una página cacheada
              // return caches.match('/offline.html');
              // O simplemente dejar que el error de red se propague al navegador.
          });
      })
  );
});
// Service Worker for Radar Map Application
const CACHE_NAME = 'radar-map-cache-v1';
const STATIC_CACHE_NAME = 'radar-map-static-v1';
const MAP_CACHE_NAME = 'radar-map-tiles-v1';
const API_CACHE_NAME = 'radar-map-api-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/main.js',
  '/app.css',
  '/vite.svg',
  '/favicon.ico'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE_NAME, MAP_CACHE_NAME, API_CACHE_NAME];
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return cacheNames.filter(
          (cacheName) => !currentCaches.includes(cacheName)
        );
      })
      .then((cachesToDelete) => {
        return Promise.all(
          cachesToDelete.map((cacheToDelete) => {
            return caches.delete(cacheToDelete);
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Helper function to determine if a request is for a map tile
function isMapTile(url) {
  return url.includes('tile.openstreetmap.org');
}

// Helper function to determine if a request is for weather data
function isWeatherApi(url) {
  return url.includes('api.weather.gov') || 
         url.includes('opengeo.ncep.noaa.gov');
}

// Helper function to determine if a request is for a static asset
function isStaticAsset(url) {
  const parsedUrl = new URL(url);
  const path = parsedUrl.pathname;
  
  return STATIC_ASSETS.some(asset => {
    // Convert asset path to pathname for comparison
    const assetPath = asset === '/' ? '/' : new URL(asset, self.location.origin).pathname;
    return path === assetPath;
  });
}

// Fetch event - handle requests with appropriate caching strategies
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Handle map tile requests - Cache first, then network
  if (isMapTile(url)) {
    event.respondWith(
      caches.open(MAP_CACHE_NAME)
        .then((cache) => {
          return cache.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              return fetch(event.request)
                .then((networkResponse) => {
                  // Cache a copy of the response
                  cache.put(event.request, networkResponse.clone());
                  return networkResponse;
                })
                .catch(() => {
                  // If both cache and network fail, return a fallback
                  return new Response('Map tile not available offline', {
                    status: 503,
                    statusText: 'Service Unavailable'
                  });
                });
            });
        })
    );
    return;
  }
  
  // Handle weather API requests - Network first, then cache
  if (isWeatherApi(url)) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Cache a copy of the response
          caches.open(API_CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          
          return networkResponse;
        })
        .catch(() => {
          // If network fails, try the cache
          return caches.open(API_CACHE_NAME)
            .then((cache) => {
              return cache.match(event.request)
                .then((cachedResponse) => {
                  if (cachedResponse) {
                    return cachedResponse;
                  }
                  
                  // If both network and cache fail, return a fallback
                  return new Response(JSON.stringify({
                    error: 'Weather data not available offline'
                  }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 503,
                    statusText: 'Service Unavailable'
                  });
                });
            });
        })
    );
    return;
  }
  
  // Handle static assets - Cache first, then network
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE_NAME)
        .then((cache) => {
          return cache.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              return fetch(event.request)
                .then((networkResponse) => {
                  // Cache a copy of the response
                  cache.put(event.request, networkResponse.clone());
                  return networkResponse;
                });
            });
        })
    );
    return;
  }
  
  // Default strategy - Network first, then cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // If both network and cache fail, return a fallback
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            return new Response('Network error, content not available offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

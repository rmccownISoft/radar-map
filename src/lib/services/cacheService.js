/**
 * Cache Service
 * Handles caching for offline use
 */

// Cache names
const MAP_CACHE_NAME = 'radar-map-tiles-v1';
const API_CACHE_NAME = 'radar-map-api-v1';
const STATIC_CACHE_NAME = 'radar-map-static-v1';

// Cache limits
const MAX_MAP_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_API_CACHE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_API_CACHE_AGE = 30 * 60 * 1000; // 30 minutes

/**
 * Initialize the cache service
 * @returns {Promise<Boolean>} Whether initialization was successful
 */
export async function initCache() {
  try {
    if ('caches' in window) {
      // Ensure cache containers exist
      await caches.open(MAP_CACHE_NAME);
      await caches.open(API_CACHE_NAME);
      await caches.open(STATIC_CACHE_NAME);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error initializing cache:', error);
    return false;
  }
}

/**
 * Cache map tiles for offline use
 * @param {Array<String>} urls - Array of tile URLs to cache
 * @returns {Promise<Number>} Number of successfully cached tiles
 */
export async function cacheMapTiles(urls) {
  if (!urls || !urls.length || !('caches' in window)) {
    return 0;
  }
  
  try {
    const cache = await caches.open(MAP_CACHE_NAME);
    let successCount = 0;
    
    // Process in batches to avoid overwhelming the browser
    const batchSize = 10;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(url => fetch(url).then(response => {
          if (response.ok) {
            return cache.put(url, response);
          }
          throw new Error(`Failed to fetch ${url}`);
        }))
      );
      
      successCount += results.filter(result => result.status === 'fulfilled').length;
    }
    
    // Trim cache if it gets too large
    await trimCache(MAP_CACHE_NAME, MAX_MAP_CACHE_SIZE);
    
    return successCount;
  } catch (error) {
    console.error('Error caching map tiles:', error);
    return 0;
  }
}

/**
 * Cache API responses for offline use
 * @param {String} url - API URL to cache
 * @param {Object} response - Response object to cache
 * @returns {Promise<Boolean>} Whether caching was successful
 */
export async function cacheApiResponse(url, response) {
  if (!url || !response || !('caches' in window)) {
    return false;
  }
  
  try {
    const cache = await caches.open(API_CACHE_NAME);
    
    // Create a new response with timestamp metadata
    const data = await response.json();
    const cachedResponse = new Response(JSON.stringify({
      data,
      timestamp: Date.now()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache-Timestamp': Date.now().toString()
      }
    });
    
    await cache.put(url, cachedResponse);
    
    // Trim cache if it gets too large
    await trimCache(API_CACHE_NAME, MAX_API_CACHE_SIZE);
    
    return true;
  } catch (error) {
    console.error('Error caching API response:', error);
    return false;
  }
}

/**
 * Get a cached API response
 * @param {String} url - API URL to retrieve
 * @param {Number} maxAge - Maximum age in milliseconds (default: 30 minutes)
 * @returns {Promise<Object>} Cached response data or null
 */
export async function getCachedApiResponse(url, maxAge = MAX_API_CACHE_AGE) {
  if (!url || !('caches' in window)) {
    return null;
  }
  
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(url);
    
    if (!cachedResponse) {
      return null;
    }
    
    const cachedData = await cachedResponse.json();
    
    // Check if the cached data is too old
    if (Date.now() - cachedData.timestamp > maxAge) {
      return null;
    }
    
    return cachedData.data;
  } catch (error) {
    console.error('Error retrieving cached API response:', error);
    return null;
  }
}

/**
 * Cache static assets for offline use
 * @param {Array<String>} urls - Array of static asset URLs to cache
 * @returns {Promise<Number>} Number of successfully cached assets
 */
export async function cacheStaticAssets(urls) {
  if (!urls || !urls.length || !('caches' in window)) {
    return 0;
  }
  
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    let successCount = 0;
    
    const results = await Promise.allSettled(
      urls.map(url => fetch(url).then(response => {
        if (response.ok) {
          return cache.put(url, response);
        }
        throw new Error(`Failed to fetch ${url}`);
      }))
    );
    
    successCount = results.filter(result => result.status === 'fulfilled').length;
    
    return successCount;
  } catch (error) {
    console.error('Error caching static assets:', error);
    return 0;
  }
}

/**
 * Check if the device is online
 * @returns {Boolean} Whether the device is online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Add event listeners for online/offline events
 * @param {Function} onlineCallback - Callback for online event
 * @param {Function} offlineCallback - Callback for offline event
 * @returns {Function} Function to remove event listeners
 */
export function addConnectivityListeners(onlineCallback, offlineCallback) {
  window.addEventListener('online', onlineCallback);
  window.addEventListener('offline', offlineCallback);
  
  return () => {
    window.removeEventListener('online', onlineCallback);
    window.removeEventListener('offline', offlineCallback);
  };
}

/**
 * Trim a cache to stay under a maximum size
 * @param {String} cacheName - Name of the cache to trim
 * @param {Number} maxSize - Maximum size in bytes
 * @returns {Promise<void>}
 */
async function trimCache(cacheName, maxSize) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length <= 10) {
      return; // Don't bother trimming if there are very few items
    }
    
    // Get cache size (approximate)
    let cacheSize = 0;
    const keysWithSize = await Promise.all(
      keys.map(async (request) => {
        const response = await cache.match(request);
        const blob = await response.blob();
        return {
          request,
          size: blob.size,
          timestamp: response.headers.get('X-Cache-Timestamp') || 0
        };
      })
    );
    
    cacheSize = keysWithSize.reduce((total, item) => total + item.size, 0);
    
    // If we're under the limit, no need to trim
    if (cacheSize <= maxSize) {
      return;
    }
    
    // Sort by timestamp (oldest first)
    keysWithSize.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest items until we're under the limit
    let sizeToRemove = cacheSize - maxSize;
    for (const item of keysWithSize) {
      if (sizeToRemove <= 0) break;
      
      await cache.delete(item.request);
      sizeToRemove -= item.size;
    }
  } catch (error) {
    console.error(`Error trimming cache ${cacheName}:`, error);
  }
}

/**
 * Clear all caches
 * @returns {Promise<Boolean>} Whether clearing was successful
 */
export async function clearAllCaches() {
  if (!('caches' in window)) {
    return false;
  }
  
  try {
    await Promise.all([
      caches.delete(MAP_CACHE_NAME),
      caches.delete(API_CACHE_NAME),
      caches.delete(STATIC_CACHE_NAME)
    ]);
    
    return true;
  } catch (error) {
    console.error('Error clearing caches:', error);
    return false;
  }
}

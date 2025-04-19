/**
 * Service Worker Registration
 * Handles registering and updating the service worker
 */

// Check if service workers are supported
const isServiceWorkerSupported = 'serviceWorker' in navigator;

/**
 * Register the service worker
 * @returns {Promise<ServiceWorkerRegistration|null>} The service worker registration or null if not supported
 */
export async function registerServiceWorker() {
  if (!isServiceWorkerSupported) {
    console.warn('Service workers are not supported by this browser');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    
    console.log('Service worker registered successfully:', registration);
    
    // Check if there's a waiting service worker
    if (registration.waiting) {
      console.log('New service worker waiting');
      notifyUpdateReady(registration);
    }
    
    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      if (!newWorker) return;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('New service worker installed and waiting');
          notifyUpdateReady(registration);
        }
      });
    });
    
    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('New service worker activated');
      window.location.reload();
    });
    
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

/**
 * Update the service worker
 * @returns {Promise<Boolean>} Whether the update was successful
 */
export async function updateServiceWorker() {
  if (!isServiceWorkerSupported) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (!registration) {
      return false;
    }
    
    await registration.update();
    return true;
  } catch (error) {
    console.error('Service worker update failed:', error);
    return false;
  }
}

/**
 * Notify that an update is ready and waiting
 * @param {ServiceWorkerRegistration} registration - The service worker registration
 */
function notifyUpdateReady(registration) {
  // Dispatch an event that can be handled by the application
  window.dispatchEvent(new CustomEvent('swUpdateReady', {
    detail: { registration }
  }));
}

/**
 * Apply a waiting service worker update
 * @param {ServiceWorkerRegistration} registration - The service worker registration
 */
export function applyUpdate(registration) {
  if (!registration || !registration.waiting) {
    return;
  }
  
  // Send a message to the waiting service worker to skip waiting
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Unregister all service workers
 * @returns {Promise<Boolean>} Whether unregistration was successful
 */
export async function unregisterServiceWorkers() {
  if (!isServiceWorkerSupported) {
    return false;
  }
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    await Promise.all(
      registrations.map(registration => registration.unregister())
    );
    
    return true;
  } catch (error) {
    console.error('Service worker unregistration failed:', error);
    return false;
  }
}

// Export whether service workers are supported
export { isServiceWorkerSupported };

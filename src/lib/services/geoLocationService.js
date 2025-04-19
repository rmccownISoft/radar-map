/**
 * Geolocation Service
 * Handles device GPS positioning
 */

// Default options for geolocation
const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 10000, // 10 seconds
  timeout: 60000 // 1 minute
};

/**
 * Check if geolocation is supported by the browser
 * @returns {Boolean} Whether geolocation is supported
 */
export function isGeolocationSupported() {
  return 'geolocation' in navigator;
}

/**
 * Get the current position once
 * @param {Function} successCallback - Callback for successful position
 * @param {Function} errorCallback - Callback for position error
 * @param {Object} options - Geolocation options
 */
export function getCurrentPosition(successCallback, errorCallback, options = {}) {
  if (!isGeolocationSupported()) {
    errorCallback({
      code: 0,
      message: 'Geolocation is not supported by this browser.'
    });
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    successCallback,
    errorCallback,
    { ...DEFAULT_OPTIONS, ...options }
  );
}

/**
 * Start watching position updates
 * @param {Function} successCallback - Callback for successful position
 * @param {Function} errorCallback - Callback for position error
 * @param {Object} options - Geolocation options
 * @returns {Number} Watch ID to use for stopping the watch
 */
export function watchPosition(successCallback, errorCallback, options = {}) {
  if (!isGeolocationSupported()) {
    errorCallback({
      code: 0,
      message: 'Geolocation is not supported by this browser.'
    });
    return null;
  }
  
  return navigator.geolocation.watchPosition(
    successCallback,
    errorCallback,
    { ...DEFAULT_OPTIONS, ...options }
  );
}

/**
 * Stop watching position updates
 * @param {Number} watchId - Watch ID returned from watchPosition
 */
export function clearWatch(watchId) {
  if (watchId !== null && isGeolocationSupported()) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Format position data into a standardized object
 * @param {Object} position - Position object from geolocation API
 * @returns {Object} Formatted position data
 */
export function formatPosition(position) {
  if (!position || !position.coords) {
    return null;
  }
  
  return {
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed
    },
    timestamp: position.timestamp,
    // Convenience properties
    latLng: [position.coords.latitude, position.coords.longitude],
    accuracyMeters: position.coords.accuracy
  };
}

/**
 * Get a human-readable error message for geolocation errors
 * @param {Object} error - Error object from geolocation API
 * @returns {String} Human-readable error message
 */
export function getErrorMessage(error) {
  if (!error) return 'Unknown error';
  
  switch(error.code) {
    case error.PERMISSION_DENIED:
      return 'Location access was denied by the user.';
    case error.POSITION_UNAVAILABLE:
      return 'Location information is unavailable.';
    case error.TIMEOUT:
      return 'The request to get location timed out.';
    default:
      return error.message || 'An unknown error occurred.';
  }
}

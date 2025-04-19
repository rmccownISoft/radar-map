/**
 * Location Store
 * Manages the user's location state
 */

import { writable, derived } from 'svelte/store';
import * as geoLocationService from '../services/geoLocationService';

// Initial state
const initialState = {
  position: null,
  accuracy: null,
  timestamp: null,
  isTracking: false,
  watchId: null,
  error: null,
  isFollowing: true
};

// Create the writable store
const locationStore = writable(initialState);

// Derived store for formatted location data
export const location = derived(
  locationStore,
  $locationStore => {
    if (!$locationStore.position) {
      return null;
    }
    
    return {
      coords: $locationStore.position, // This is already in [lat, lng] format
      accuracy: $locationStore.accuracy,
      timestamp: $locationStore.timestamp,
      isTracking: $locationStore.isTracking,
      isFollowing: $locationStore.isFollowing
    };
  }
);

// Derived store for tracking status
export const trackingStatus = derived(
  locationStore,
  $locationStore => ({
    isTracking: $locationStore.isTracking,
    isFollowing: $locationStore.isFollowing,
    error: $locationStore.error
  })
);

// Start tracking the user's location
export function startTracking() {
  locationStore.update(state => {
    // Don't start tracking if already tracking
    if (state.isTracking && state.watchId !== null) {
      return state;
    }
    
    // Check if geolocation is supported
    if (!geoLocationService.isGeolocationSupported()) {
      return {
        ...state,
        error: 'Geolocation is not supported by your browser'
      };
    }
    
    // Start watching position
    const watchId = geoLocationService.watchPosition(
      handlePositionUpdate,
      handlePositionError
    );
    
    return {
      ...state,
      isTracking: true,
      watchId,
      error: null
    };
  });
}

// Stop tracking the user's location
export function stopTracking() {
  locationStore.update(state => {
    // Clear the watch if it exists
    if (state.watchId !== null) {
      geoLocationService.clearWatch(state.watchId);
    }
    
    return {
      ...state,
      isTracking: false,
      watchId: null
    };
  });
}

// Toggle following mode
export function toggleFollowing(isFollowing) {
  locationStore.update(state => ({
    ...state,
    isFollowing: isFollowing !== undefined ? isFollowing : !state.isFollowing
  }));
}

// Get the current position once
export function getCurrentPosition() {
  geoLocationService.getCurrentPosition(
    handlePositionUpdate,
    handlePositionError
  );
}

// Handle successful position update
function handlePositionUpdate(position) {
  const formattedPosition = geoLocationService.formatPosition(position);
  
  locationStore.update(state => ({
    ...state,
    position: formattedPosition.latLng,
    accuracy: formattedPosition.accuracyMeters,
    timestamp: formattedPosition.timestamp,
    error: null
  }));
}

// Handle position error
function handlePositionError(error) {
  const errorMessage = geoLocationService.getErrorMessage(error);
  
  locationStore.update(state => ({
    ...state,
    error: errorMessage
  }));
}

// Reset the location store
export function resetLocation() {
  stopTracking();
  locationStore.set(initialState);
}

// Export the store
export default locationStore;

/**
 * Map Store
 * Manages the map state
 */

import { writable, derived } from 'svelte/store';
import * as mapService from '../services/mapService';

// Initial state
const initialState = {
  center: [39.8283, -98.5795], // Default center of US
  zoom: 5,
  bounds: null,
  mapInstance: null,
  isReady: false,
  lastInteraction: null
};

// Create the writable store
const mapStore = writable(initialState);

// Derived store for map view
export const mapView = derived(
  mapStore,
  $mapStore => ({
    center: $mapStore.center,
    zoom: $mapStore.zoom,
    bounds: $mapStore.bounds
  })
);

// Derived store for map status
export const mapStatus = derived(
  mapStore,
  $mapStore => ({
    isReady: $mapStore.isReady,
    lastInteraction: $mapStore.lastInteraction
  })
);

// Set the map instance
export function setMapInstance(map) {
  if (!map) return;
  
  mapStore.update(state => ({
    ...state,
    mapInstance: map,
    isReady: true
  }));
  
  // Update bounds after map is ready
  updateBounds(map);
}

// Update the map center and zoom
export function updateMapView(center, zoom, skipViewUpdate = false) {
  mapStore.update(state => {
    // If we have a map instance, update the view, but only if not triggered by a map event
    if (state.mapInstance && center && !skipViewUpdate) {
      mapService.setMapView(state.mapInstance, center, zoom);
    }
    
    return {
      ...state,
      center: center || state.center,
      zoom: zoom !== undefined ? zoom : state.zoom,
      lastInteraction: Date.now()
    };
  });
}

// Update the map bounds
export function updateBounds(map) {
  if (!map) {
    mapStore.update(state => {
      if (!state.mapInstance) return state;
      map = state.mapInstance;
    });
  }
  
  if (!map) return;
  
  const bounds = mapService.getMapBounds(map);
  
  mapStore.update(state => ({
    ...state,
    bounds
  }));
  
  return bounds;
}

// Fit the map to bounds
export function fitBounds(bounds) {
  mapStore.update(state => {
    if (!state.mapInstance || !bounds) return state;
    
    mapService.fitMapToBounds(state.mapInstance, bounds);
    
    // Update center and zoom after fitting bounds
    const newCenter = mapService.getMapCenter(state.mapInstance);
    const newZoom = mapService.getZoomLevel(state.mapInstance);
    
    return {
      ...state,
      center: newCenter,
      zoom: newZoom,
      lastInteraction: Date.now()
    };
  });
}

// Pan to a specific location
export function panTo(center) {
  mapStore.update(state => {
    if (!state.mapInstance || !center) return state;
    
    mapService.setMapView(state.mapInstance, center);
    
    return {
      ...state,
      center,
      lastInteraction: Date.now()
    };
  });
}

// Zoom in
export function zoomIn() {
  mapStore.update(state => {
    if (!state.mapInstance) return state;
    
    const newZoom = Math.min(state.zoom + 1, 18);
    mapService.setMapView(state.mapInstance, state.center, newZoom);
    
    return {
      ...state,
      zoom: newZoom,
      lastInteraction: Date.now()
    };
  });
}

// Zoom out
export function zoomOut() {
  mapStore.update(state => {
    if (!state.mapInstance) return state;
    
    const newZoom = Math.max(state.zoom - 1, 3);
    mapService.setMapView(state.mapInstance, state.center, newZoom);
    
    return {
      ...state,
      zoom: newZoom,
      lastInteraction: Date.now()
    };
  });
}

// Calculate distance between two points
export function calculateDistance(point1, point2) {
  return mapService.calculateDistance(point1, point2);
}

// Get the current map instance
export function getMapInstance() {
  let instance = null;
  
  mapStore.update(state => {
    instance = state.mapInstance;
    return state;
  });
  
  return instance;
}

// Reset the map store
export function resetMap() {
  mapStore.set(initialState);
}

// Export the store
export default mapStore;

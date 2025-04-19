/**
 * Weather Store
 * Manages weather data state
 */

import { writable, derived } from 'svelte/store';
import * as weatherService from '../services/weatherService';
import * as cacheService from '../services/cacheService';
import mapStore from './mapStore';

// Initial state
const initialState = {
  alerts: [],
  radarVisible: true,
  alertsVisible: true,
  lastUpdate: null,
  isLoading: false,
  error: null,
  refreshInterval: null,
  autoRefresh: true
};

// Create the writable store
const weatherStore = writable(initialState);

// Derived store for weather alerts
export const alerts = derived(
  weatherStore,
  $weatherStore => $weatherStore.alerts
);

// Derived store for weather status
export const weatherStatus = derived(
  weatherStore,
  $weatherStore => ({
    radarVisible: $weatherStore.radarVisible,
    alertsVisible: $weatherStore.alertsVisible,
    lastUpdate: $weatherStore.lastUpdate,
    isLoading: $weatherStore.isLoading,
    error: $weatherStore.error,
    autoRefresh: $weatherStore.autoRefresh
  })
);

// Derived store for severe alerts
export const severeAlerts = derived(
  weatherStore,
  $weatherStore => $weatherStore.alerts.filter(alert => 
    weatherService.isSevereAlert(alert)
  )
);

// Toggle radar visibility
export function toggleRadar(visible) {
  weatherStore.update(state => ({
    ...state,
    radarVisible: visible !== undefined ? visible : !state.radarVisible
  }));
}

// Toggle alerts visibility
export function toggleAlerts(visible) {
  weatherStore.update(state => ({
    ...state,
    alertsVisible: visible !== undefined ? visible : !state.alertsVisible
  }));
}

// Toggle auto refresh
export function toggleAutoRefresh(enabled) {
  weatherStore.update(state => {
    // Clear existing interval if disabling
    if (state.refreshInterval && (enabled === false || (enabled === undefined && state.autoRefresh))) {
      clearInterval(state.refreshInterval);
    }
    
    // Set up new interval if enabling
    let refreshInterval = null;
    if (enabled === true || (enabled === undefined && !state.autoRefresh)) {
      refreshInterval = setInterval(refreshWeather, 5 * 60 * 1000); // Refresh every 5 minutes
    }
    
    return {
      ...state,
      autoRefresh: enabled !== undefined ? enabled : !state.autoRefresh,
      refreshInterval
    };
  });
}

// Load weather alerts
export async function loadWeatherAlerts(forceRefresh = false) {
  let bounds;
  
  // Get current map bounds from the map store
  mapStore.update(state => {
    bounds = state.bounds;
    return state;
  });
  
  if (!bounds) {
    return;
  }
  
  weatherStore.update(state => ({
    ...state,
    isLoading: true,
    error: null
  }));
  
  try {
    // Try to get alerts from cache first if not forcing refresh
    let alerts = [];
    if (!forceRefresh && cacheService.isOnline()) {
      const alertsUrl = `https://api.weather.gov/alerts/active?status=actual&message_type=alert`;
      const cachedAlerts = await cacheService.getCachedApiResponse(alertsUrl);
      
      if (cachedAlerts) {
        alerts = cachedAlerts;
      } else {
        // Fetch fresh data if cache miss
        alerts = await weatherService.getActiveAlerts(bounds, true);
        
        // Cache the response
        if (alerts.length > 0) {
          const response = new Response(JSON.stringify(alerts));
          const alertsUrl = `https://api.weather.gov/alerts/active?status=actual&message_type=alert`;
          await cacheService.cacheApiResponse(alertsUrl, response);
        }
      }
    } else {
      // Fetch fresh data
      alerts = await weatherService.getActiveAlerts(bounds, true);
    }
    
    weatherStore.update(state => ({
      ...state,
      alerts,
      lastUpdate: new Date(),
      isLoading: false
    }));
  } catch (error) {
    console.error('Error loading weather alerts:', error);
    
    weatherStore.update(state => ({
      ...state,
      error: 'Failed to load weather alerts. Please try again later.',
      isLoading: false
    }));
  }
}

// Refresh weather data
export function refreshWeather() {
  loadWeatherAlerts(true);
}

// Format alerts for display
export function getFormattedAlerts() {
  let formattedAlerts = [];
  
  weatherStore.update(state => {
    formattedAlerts = state.alerts.map(weatherService.formatAlert).filter(Boolean);
    return state;
  });
  
  return formattedAlerts;
}

// Get radar layer parameters
export function getRadarLayerParams(opacity = 0.7) {
  return weatherService.getRadarLayerParams(opacity);
}

// Get radar layer URL
export function getRadarLayerUrl() {
  return weatherService.getRadarLayerUrl();
}

// Initialize the weather store
export function initWeatherStore() {
  // Set up auto refresh if enabled
  weatherStore.update(state => {
    if (state.autoRefresh) {
      const refreshInterval = setInterval(refreshWeather, 5 * 60 * 1000); // Refresh every 5 minutes
      return { ...state, refreshInterval };
    }
    return state;
  });
  
  // Initial load of weather data
  loadWeatherAlerts();
  
  // Set up connectivity listeners
  cacheService.addConnectivityListeners(
    // Online callback
    () => {
      loadWeatherAlerts(true);
    },
    // Offline callback
    () => {
      weatherStore.update(state => ({
        ...state,
        error: 'You are offline. Weather data may not be up to date.'
      }));
    }
  );
}

// Clean up the weather store
export function cleanupWeatherStore() {
  weatherStore.update(state => {
    if (state.refreshInterval) {
      clearInterval(state.refreshInterval);
    }
    return { ...state, refreshInterval: null };
  });
}

// Reset the weather store
export function resetWeather() {
  cleanupWeatherStore();
  weatherStore.set(initialState);
}

// Export the store
export default weatherStore;

/**
 * Map Service
 * Handles map-related functionality and caching
 */

import L from 'leaflet';

// Default map settings
const DEFAULT_CENTER = [39.8283, -98.5795]; // Center of US
const DEFAULT_ZOOM = 5;
const MAX_ZOOM = 19;
const MIN_ZOOM = 3;

/**
 * Create a map instance
 * @param {HTMLElement} element - DOM element to render the map
 * @param {Array<number>} center - Initial center coordinates [lat, lng]
 * @param {Number} zoom - Initial zoom level
 * @returns {Object} Leaflet map instance
 */
export function createMap(element, center = DEFAULT_CENTER, zoom = DEFAULT_ZOOM) {
  if (!element) {
    throw new Error('Map element is required');
  }
  
  // Create map instance
  const map = L.map(element, {
    center: center,
    zoom: zoom,
    zoomControl: true,
    attributionControl: true,
    maxZoom: MAX_ZOOM,
    minZoom: MIN_ZOOM
  });
  
  // Add OpenStreetMap tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: MAX_ZOOM
  }).addTo(map);
  
  return map;
}

/**
 * Get the bounds of the current map view
 * @param {Object} map - Leaflet map instance
 * @returns {Object} Bounds object with north, south, east, west properties
 */
export function getMapBounds(map) {
  if (!map) return null;
  
  const bounds = map.getBounds();
  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest()
  };
}

/**
 * Calculate the distance between two points in kilometers
 * @param {Array} point1 - First point coordinates [lat, lng]
 * @param {Array} point2 - Second point coordinates [lat, lng]
 * @returns {Number} Distance in kilometers
 */
export function calculateDistance(point1, point2) {
  if (!point1 || !point2) return 0;
  
  const lat1 = point1[0];
  const lon1 = point1[1];
  const lat2 = point2[0];
  const lon2 = point2[1];
  
  // Haversine formula
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  
  return distance;
}

/**
 * Convert degrees to radians
 * @param {Number} deg - Degrees
 * @returns {Number} Radians
 */
function deg2rad(deg) {
  return deg * (Math.PI/180);
}

/**
 * Create a marker on the map
 * @param {Object} map - Leaflet map instance
 * @param {Array<number>} position - Marker position [lat, lng]
 * @param {Object} options - Marker options
 * @returns {Object} Leaflet marker instance
 */
export function createMarker(map, position, options = {}) {
  if (!map || !position) return null;
  
  const marker = L.marker(position, options).addTo(map);
  return marker;
}

/**
 * Create a circle on the map
 * @param {Object} map - Leaflet map instance
 * @param {Array<number>} center - Circle center [lat, lng]
 * @param {Number} radius - Circle radius in meters
 * @param {Object} options - Circle options
 * @returns {Object} Leaflet circle instance
 */
export function createCircle(map, center, radius, options = {}) {
  if (!map || !center) return null;
  
  const circle = L.circle(center, {
    radius: radius,
    ...options
  }).addTo(map);
  
  return circle;
}

/**
 * Get the center of the map
 * @param {Object} map - Leaflet map instance
 * @returns {Array<number>} Center coordinates [lat, lng]
 */
export function getMapCenter(map) {
  if (!map) return DEFAULT_CENTER;
  
  const center = map.getCenter();
  return [center.lat, center.lng];
}

/**
 * Get the current zoom level
 * @param {Object} map - Leaflet map instance
 * @returns {Number} Zoom level
 */
export function getZoomLevel(map) {
  if (!map) return DEFAULT_ZOOM;
  
  return map.getZoom();
}

/**
 * Set the view of the map
 * @param {Object} map - Leaflet map instance
 * @param {Array<number>} center - Center coordinates [lat, lng]
 * @param {Number} zoom - Zoom level
 */
export function setMapView(map, center, zoom = null) {
  if (!map || !center) return;
  
  if (zoom !== null) {
    map.setView(center, zoom);
  } else {
    map.panTo(center);
  }
}

/**
 * Fit the map to bounds
 * @param {Object} map - Leaflet map instance
 * @param {Array} bounds - Array of coordinates [[lat1, lng1], [lat2, lng2], ...]
 */
export function fitMapToBounds(map, bounds) {
  if (!map || !bounds || !bounds.length) return;
  
  map.fitBounds(bounds);
}

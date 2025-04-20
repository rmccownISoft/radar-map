/**
 * Weather Service
 * Handles fetching and processing weather data
 */

// NWS API endpoints
const NWS_BASE_URL = 'https://api.weather.gov';
const NWS_ALERTS_URL = `${NWS_BASE_URL}/alerts/active`;
const NWS_RADAR_URL = 'https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows';

// Cache settings
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
let alertsCache = {
  data: null,
  timestamp: null,
  bounds: null
};

/**
 * Fetch active weather alerts for a geographic area
 * @param {Object} bounds - Map bounds object with north, south, east, west properties
 * @param {Boolean} forceRefresh - Whether to force a refresh ignoring cache
 * @returns {Promise<Array>} Array of alert objects
 */
export async function getActiveAlerts(bounds, forceRefresh = false) {
  // Check if we have cached data for these bounds
  if (!forceRefresh && 
      alertsCache.data && 
      alertsCache.timestamp && 
      (Date.now() - alertsCache.timestamp < CACHE_DURATION) &&
      boundsContained(bounds, alertsCache.bounds)) {
    return alertsCache.data;
  }
  
  try {
    // Construct the URL with bounds parameters
    // Note: The NWS API expects area parameter in format: point1,point2 where each point is lat,lon
    // We'll use a simpler approach with a bounding box that's more reliable
    const url = `${NWS_ALERTS_URL}?status=actual&message_type=alert`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the results
    alertsCache = {
      data: data.features || [],
      timestamp: Date.now(),
      bounds: { ...bounds }
    };
    
    return data.features || [];
  } catch (error) {
    console.error('Error fetching weather alerts:', error);
    throw error;
  }
}

/**
 * Get the radar layer URL for a WMS service
 * @returns {String} URL for the radar WMS layer
 */
export function getRadarLayerUrl() {
  return NWS_RADAR_URL;
}

/**
 * Get radar layer parameters for Leaflet WMS
 * @param {Number} opacity - Layer opacity (0-1)
 * @param {Date} [timestamp] - Optional timestamp for historical data
 * @returns {Object} WMS parameters object
 */
export function getRadarLayerParams(opacity = 0.7, timestamp = null) {
  const params = {
    layers: 'conus_bref_qcd',
    format: 'image/png',
    transparent: true,
    opacity: opacity,
    attribution: 'NOAA/National Weather Service'
  };
  
  // Add timestamp if provided
  if (timestamp) {
    params.time = timestamp.toISOString();
  }
  
  return params;
}

/**
 * Generate timestamps for radar animation frames
 * @param {Number} frameCount - Number of frames to generate
 * @param {Number} intervalMinutes - Minutes between frames
 * @returns {Array<Date>} Array of timestamps
 */
export function generateRadarFrameTimestamps(frameCount = 10, intervalMinutes = 5) {
  const timestamps = [];
  const now = new Date();
  
  // Generate timestamps at regular intervals going backward from now
  for (let i = 0; i < frameCount; i++) {
    const timestamp = new Date(now);
    timestamp.setMinutes(now.getMinutes() - (i * intervalMinutes));
    timestamps.push(timestamp);
  }
  
  return timestamps;
}

/**
 * Check if a weather alert is severe
 * @param {Object} alert - Weather alert object
 * @returns {Boolean} Whether the alert is severe
 */
export function isSevereAlert(alert) {
  if (!alert || !alert.properties || !alert.properties.event) {
    return false;
  }
  
  const severeEvents = [
    'Tornado Warning',
    'Severe Thunderstorm Warning',
    'Flash Flood Warning',
    'Hurricane Warning',
    'Tsunami Warning',
    'Blizzard Warning'
  ];
  
  return severeEvents.includes(alert.properties.event);
}

/**
 * Get the severity level of a weather alert
 * @param {Object} alert - Weather alert object
 * @returns {String} Severity level (extreme, severe, moderate, minor)
 */
export function getAlertSeverity(alert) {
  if (!alert || !alert.properties || !alert.properties.event) {
    return 'minor';
  }
  
  const event = alert.properties.event;
  
  // Extreme alerts
  if (['Tornado Warning', 'Hurricane Warning', 'Tsunami Warning'].includes(event)) {
    return 'extreme';
  }
  
  // Severe alerts
  if (['Severe Thunderstorm Warning', 'Flash Flood Warning', 'Blizzard Warning'].includes(event)) {
    return 'severe';
  }
  
  // Moderate alerts
  if (['Winter Storm Warning', 'Flood Warning', 'Wind Advisory'].includes(event)) {
    return 'moderate';
  }
  
  // Default to minor
  return 'minor';
}

/**
 * Format a weather alert for display
 * @param {Object} alert - Weather alert object
 * @returns {Object} Formatted alert object
 */
export function formatAlert(alert) {
  if (!alert || !alert.properties) {
    return null;
  }
  
  const props = alert.properties;
  
  return {
    id: props.id,
    event: props.event,
    headline: props.headline,
    description: props.description,
    instruction: props.instruction,
    severity: getAlertSeverity(alert),
    effective: new Date(props.effective),
    expires: new Date(props.expires),
    senderName: props.senderName,
    areaDesc: props.areaDesc,
    geometry: alert.geometry
  };
}

/**
 * Check if one bounds object is contained within another
 * @param {Object} innerBounds - The smaller bounds
 * @param {Object} outerBounds - The larger bounds
 * @returns {Boolean} Whether innerBounds is contained within outerBounds
 */
function boundsContained(innerBounds, outerBounds) {
  if (!innerBounds || !outerBounds) {
    return false;
  }
  
  return (
    innerBounds.north <= outerBounds.north &&
    innerBounds.south >= outerBounds.south &&
    innerBounds.east <= outerBounds.east &&
    innerBounds.west >= outerBounds.west
  );
}

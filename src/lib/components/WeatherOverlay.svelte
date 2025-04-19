<script>
  import { onMount, onDestroy } from 'svelte';
  import L from 'leaflet';
  
  // Props
  export let map; // Leaflet map instance
  export let visible = true;
  
  // State
  let radarLayer = null;
  let warningsLayer = null;
  let lastUpdate = null;
  let isLoading = false;
  let errorMessage = null;
  
  // Dispatch custom events
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  
  // NWS API endpoints
  const NWS_RADAR_URL = 'https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows';
  const NWS_WARNINGS_URL = 'https://api.weather.gov/alerts/active';
  
  // Initialize the weather overlay
  onMount(() => {
    if (map && visible) {
      loadRadarLayer();
    }
  });
  
  // Watch for changes to the visible prop
  $: if (map && visible !== undefined) {
    if (visible) {
      loadRadarLayer();
      loadWarnings();
    } else {
      removeRadarLayer();
      removeWarningsLayer();
    }
  }
  
  // Load radar data
  async function loadRadarLayer() {
    if (!map) return;
    
    try {
      isLoading = true;
      errorMessage = null;
      
      // Remove existing layer if it exists
      removeRadarLayer();
      
      // Create WMS layer for radar
      radarLayer = L.tileLayer.wms(NWS_RADAR_URL, {
        layers: 'conus_bref_qcd',
        format: 'image/png',
        transparent: true,
        opacity: 0.7,
        attribution: 'NOAA/National Weather Service'
      }).addTo(map);
      
      // Handle error events for the tile layer
      radarLayer.on('tileerror', (error) => {
        console.warn('Tile loading error:', error);
        // Don't show error message for individual tile errors
        // as they might be temporary or partial
      });
      
      lastUpdate = new Date();
      isLoading = false;
      
      dispatch('radarLoaded', { timestamp: lastUpdate });
    } catch (error) {
      console.error('Error loading radar data:', error);
      errorMessage = 'Failed to load radar data';
      isLoading = false;
      
      dispatch('error', { 
        source: 'radar', 
        message: errorMessage,
        error: error
      });
    }
  }
  
  // Remove radar layer
  function removeRadarLayer() {
    if (map && radarLayer) {
      map.removeLayer(radarLayer);
      radarLayer = null;
    }
  }
  
  // Load weather warnings
  async function loadWarnings() {
    if (!map) return;
    
    try {
      isLoading = true;
      errorMessage = null;
      
      // Remove existing warnings layer if it exists
      removeWarningsLayer();
      
      // Create a new layer group for warnings
      warningsLayer = L.layerGroup().addTo(map);
      
      // Fetch warnings - simplified to avoid API issues
      const response = await fetch(`${NWS_WARNINGS_URL}?status=actual&message_type=alert`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process and display warnings
      if (data.features && data.features.length > 0) {
        // Filter warnings to those within the current map bounds
        const bounds = map.getBounds();
        const visibleWarnings = data.features.filter(feature => {
          // Simple check - if we have geometry, try to see if it's in bounds
          if (feature.geometry && feature.geometry.coordinates) {
            // For polygons, check if any point is within bounds
            if (feature.geometry.type.includes('Polygon')) {
              const coords = feature.geometry.coordinates[0]; // First ring of coordinates
              return coords.some(coord => {
                const lng = coord[0];
                const lat = coord[1];
                return bounds.contains([lat, lng]);
              });
            }
          }
          // Include by default if we can't determine
          return true;
        });
        
        visibleWarnings.forEach(feature => {
          if (feature.geometry && feature.properties) {
            try {
              // Create polygon for the warning area
              const warningPolygon = L.geoJSON(feature.geometry, {
                style: getWarningStyle(feature.properties.event)
              }).addTo(warningsLayer);
              
              // Add popup with warning details
              warningPolygon.bindPopup(`
                <h3>${feature.properties.event || 'Weather Warning'}</h3>
                <p><strong>Issued:</strong> ${new Date(feature.properties.effective || Date.now()).toLocaleString()}</p>
                <p><strong>Expires:</strong> ${new Date(feature.properties.expires || Date.now()).toLocaleString()}</p>
                <p>${feature.properties.headline || 'No details available'}</p>
                ${feature.properties.url ? `<p><a href="${feature.properties.url}" target="_blank">More details</a></p>` : ''}
              `);
            } catch (err) {
              console.warn('Error adding warning to map:', err);
              // Continue with other warnings
            }
          }
        });
        
        dispatch('warningsLoaded', { 
          count: visibleWarnings.length,
          warnings: visibleWarnings
        });
      } else {
        dispatch('warningsLoaded', { count: 0, warnings: [] });
      }
      
      isLoading = false;
      lastUpdate = new Date();
    } catch (error) {
      console.error('Error loading weather warnings:', error);
      errorMessage = 'Failed to load weather warnings';
      isLoading = false;
      
      dispatch('error', { 
        source: 'warnings', 
        message: errorMessage,
        error: error
      });
    }
  }
  
  // Remove warnings layer
  function removeWarningsLayer() {
    if (map && warningsLayer) {
      map.removeLayer(warningsLayer);
      warningsLayer = null;
    }
  }
  
  // Get style for different warning types
  function getWarningStyle(warningType) {
    const warningStyles = {
      'Tornado Warning': { color: '#FF0000', weight: 2, fillOpacity: 0.3 },
      'Severe Thunderstorm Warning': { color: '#FF9500', weight: 2, fillOpacity: 0.3 },
      'Flash Flood Warning': { color: '#00FF00', weight: 2, fillOpacity: 0.3 },
      'Flood Warning': { color: '#00FFFF', weight: 2, fillOpacity: 0.3 },
      'Winter Storm Warning': { color: '#0000FF', weight: 2, fillOpacity: 0.3 },
      'Hurricane Warning': { color: '#FF00FF', weight: 2, fillOpacity: 0.3 },
      'default': { color: '#FFFF00', weight: 2, fillOpacity: 0.3 }
    };
    
    return warningStyles[warningType] || warningStyles.default;
  }
  
  // Refresh weather data
  export function refresh() {
    loadRadarLayer();
    loadWarnings();
    
    dispatch('refreshed', { timestamp: new Date() });
  }
  
  // Clean up on component destroy
  onDestroy(() => {
    removeRadarLayer();
    removeWarningsLayer();
  });
</script>

{#if errorMessage}
  <div class="error-message">
    {errorMessage}
    <button on:click={refresh}>Retry</button>
  </div>
{/if}

{#if isLoading}
  <div class="loading-indicator">
    Loading weather data...
  </div>
{/if}

<style>
  .error-message {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background-color: rgba(255, 0, 0, 0.7);
    color: white;
    padding: 10px;
    border-radius: 5px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .loading-indicator {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px;
    border-radius: 5px;
    z-index: 1000;
  }
  
  .error-message button {
    background-color: white;
    color: red;
    border: none;
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
  }
</style>

<script>
  import { onMount, onDestroy } from 'svelte';
  import L from 'leaflet';
  import * as weatherService from '../services/weatherService';
  
  // Props
  export let map; // Leaflet map instance
  export let visible = true;
  
  // State
  let radarLayer = null;
  let nextRadarLayer = null;
  let warningsLayer = null;
  let lastUpdate = null;
  let isLoading = false;
  let errorMessage = null;
  let radarFrames = [];
  let currentFrameIndex = 0;
  let animationInterval = null;
  let isAnimating = false;
  let frameCount = 10; // Number of frames to keep
  let frameIntervalMs = 500; // Time between frames in milliseconds
  let transitionDuration = 300; // Duration of cross-fade transition in milliseconds
  let isTransitioning = false;
  let warningsByFrame = []; // Warnings for each frame
  
  // Dispatch custom events
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  
  // NWS API endpoints
  const NWS_WARNINGS_URL = 'https://api.weather.gov/alerts/active';
  
  // Initialize the weather overlay
  onMount(() => {
    if (map && visible) {
      loadRadarFrames();
      loadWarnings();
    }
  });
  
  // Watch for changes to the visible prop
  $: if (map && visible !== undefined) {
    if (visible) {
      loadRadarFrames();
      loadWarnings();
    } else {
      stopAnimation();
      removeRadarLayer();
      removeWarningsLayer();
    }
  }
  
  // Load radar frames
  async function loadRadarFrames() {
    if (!map) return;
    
    try {
      isLoading = true;
      errorMessage = null;
      
      // Stop any existing animation
      stopAnimation();
      
      // Remove existing layers if they exist
      removeRadarLayer();
      removeWarningsLayer();
      
      // Generate timestamps for frames (every 5 minutes going back)
      const timestamps = weatherService.generateRadarFrameTimestamps(frameCount, 5);
      
      // Reverse the timestamps to show them in chronological order (oldest to newest)
      const orderedTimestamps = [...timestamps].reverse();
      
      // Create frames for each timestamp but don't add to map yet
      const newFrames = orderedTimestamps.map(timestamp => ({
        timestamp,
        layer: createRadarLayer(timestamp)
      }));
      
      // Store the frames
      radarFrames = newFrames;
      
      // Preload all layers by adding them to the map with opacity 0
      // This ensures all tiles are loaded before we need to display them
      radarFrames.forEach((frame, index) => {
        if (index > 0) {
          // All frames except the first one start with opacity 0
          frame.layer.setOpacity(0);
        } else {
          // First frame is visible
          frame.layer.setOpacity(0.7);
        }
        frame.layer.addTo(map);
      });
      
      // Set current frame to the first one
      currentFrameIndex = 0;
      radarLayer = radarFrames[0].layer;
      
      // Load warnings for each frame
      await loadWarningsForFrames();
      
      lastUpdate = new Date();
      isLoading = false;
      
      dispatch('radarLoaded', { timestamp: lastUpdate });
      dispatch('frameChanged', { 
        index: currentFrameIndex,
        timestamp: radarFrames[currentFrameIndex].timestamp,
        total: radarFrames.length
      });
      
      // Show warnings for the first frame
      showWarningsForFrame(currentFrameIndex);
      
      // Start animation if we have multiple frames
      if (radarFrames.length > 1) {
        startAnimation();
      }
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
  
  // Create a radar layer for a specific time
  function createRadarLayer(timestamp) {
    const radarUrl = weatherService.getRadarLayerUrl();
    const params = weatherService.getRadarLayerParams(0.7, timestamp);
    
    const layer = L.tileLayer.wms(radarUrl, params);
    
    // Handle error events for the tile layer
    layer.on('tileerror', (error) => {
      console.warn('Tile loading error:', error);
      // Don't show error message for individual tile errors
      // as they might be temporary or partial
    });
    
    return layer;
  }
  
  // Show a specific frame with smooth transition
  function showFrame(index) {
    if (!map || radarFrames.length === 0 || isTransitioning) return;
    
    // Ensure index is within bounds
    index = Math.max(0, Math.min(index, radarFrames.length - 1));
    
    // If it's the same frame, do nothing
    if (index === currentFrameIndex) return;
    
    // Set transitioning flag
    isTransitioning = true;
    
    // Get the current and next frame layers
    const currentFrame = radarFrames[currentFrameIndex];
    const nextFrame = radarFrames[index];
    
    // Start time for animation
    const startTime = Date.now();
    const initialOpacity = 0.7;
    
    // Use a smoother easing function
    const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    
    // Animate the transition
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / transitionDuration, 1);
      
      // Apply easing for smoother transition
      const progress = easeInOutCubic(rawProgress);
      
      // Calculate new opacities
      const oldOpacity = initialOpacity * (1 - progress);
      const newOpacity = initialOpacity * progress;
      
      // Set opacities
      currentFrame.layer.setOpacity(oldOpacity);
      nextFrame.layer.setOpacity(newOpacity);
      
      // Continue animation if not complete
      if (rawProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete
        isTransitioning = false;
        currentFrameIndex = index;
        radarLayer = nextFrame.layer;
        
        // Update warnings for this frame
        showWarningsForFrame(index);
        
        // Dispatch event with current frame info
        dispatch('frameChanged', { 
          index: currentFrameIndex,
          timestamp: radarFrames[currentFrameIndex].timestamp,
          total: radarFrames.length
        });
      }
    };
    
    // Start the animation
    requestAnimationFrame(animate);
  }
  
  // Start animation loop
  function startAnimation() {
    if (animationInterval) return;
    
    isAnimating = true;
    animationInterval = setInterval(() => {
      // Move to next frame, loop back to start if at the end
      const nextIndex = (currentFrameIndex + 1) % radarFrames.length;
      showFrame(nextIndex);
    }, frameIntervalMs);
    
    dispatch('animationStarted');
  }
  
  // Stop animation loop
  function stopAnimation() {
    if (animationInterval) {
      clearInterval(animationInterval);
      animationInterval = null;
    }
    isAnimating = false;
    
    dispatch('animationStopped');
  }
  
  // Toggle animation
  export function toggleAnimation() {
    if (isAnimating) {
      stopAnimation();
    } else {
      startAnimation();
    }
    return isAnimating;
  }
  
  // Remove all radar layers
  function removeRadarLayer() {
    // Remove all frames from the map
    if (map && radarFrames.length > 0) {
      radarFrames.forEach(frame => {
        if (frame.layer) {
          map.removeLayer(frame.layer);
        }
      });
    }
    
    radarFrames = [];
    radarLayer = null;
    nextRadarLayer = null;
    isTransitioning = false;
  }
  
  // Load warnings for all frames
  async function loadWarningsForFrames() {
    if (!map || radarFrames.length === 0) return;
    
    try {
      // Fetch warnings - simplified to avoid API issues
      const response = await fetch(`${NWS_WARNINGS_URL}?status=actual&message_type=alert`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        warningsByFrame = radarFrames.map(() => []);
        return;
      }
      
      // Get map bounds
      const bounds = map.getBounds();
      
      // Process warnings for each frame
      warningsByFrame = radarFrames.map(frame => {
        const frameTime = frame.timestamp.getTime();
        
        // Filter warnings that are active at this frame's time and within map bounds
        return data.features.filter(feature => {
          if (!feature.properties || !feature.geometry) return false;
          
          // Check if warning is active at this time
          const effectiveTime = new Date(feature.properties.effective || 0).getTime();
          const expiresTime = new Date(feature.properties.expires || 0).getTime();
          
          const isActiveAtTime = frameTime >= effectiveTime && frameTime <= expiresTime;
          if (!isActiveAtTime) return false;
          
          // Check if warning is within map bounds
          if (feature.geometry.coordinates) {
            if (feature.geometry.type.includes('Polygon')) {
              const coords = feature.geometry.coordinates[0]; // First ring of coordinates
              return coords.some(coord => {
                const lng = coord[0];
                const lat = coord[1];
                return bounds.contains([lat, lng]);
              });
            }
          }
          
          return true;
        });
      });
      
    } catch (error) {
      console.error('Error loading weather warnings:', error);
      errorMessage = 'Failed to load weather warnings';
      
      dispatch('error', { 
        source: 'warnings', 
        message: errorMessage,
        error: error
      });
      
      // Initialize empty warnings
      warningsByFrame = radarFrames.map(() => []);
    }
  }
  
  // Show warnings for a specific frame
  function showWarningsForFrame(frameIndex) {
    if (!map || !warningsByFrame[frameIndex]) return;
    
    // Remove existing warnings layer
    removeWarningsLayer();
    
    // Create a new layer group for warnings
    warningsLayer = L.layerGroup().addTo(map);
    
    // Get warnings for this frame
    const warnings = warningsByFrame[frameIndex];
    
    // Add warnings to the map
    warnings.forEach(feature => {
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
      count: warnings.length,
      warnings: warnings
    });
  }
  
  // Load current weather warnings (for initial load)
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
    loadRadarFrames();
    
    dispatch('refreshed', { timestamp: new Date() });
  }
  
  // Clean up on component destroy
  onDestroy(() => {
    stopAnimation();
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

{#if visible && radarFrames.length > 0}
  <div class="radar-controls">
    <button 
      class="control-button {isAnimating ? 'active' : ''}" 
      on:click={toggleAnimation}
      title="{isAnimating ? 'Pause animation' : 'Play animation'}"
    >
      <span class="icon">{isAnimating ? '⏸️' : '▶️'}</span>
    </button>
    
    <div class="frame-info">
      <span class="frame-count">{currentFrameIndex + 1}/{radarFrames.length}</span>
      {#if radarFrames[currentFrameIndex]}
        <span class="frame-time">
          {radarFrames[currentFrameIndex].timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
        </span>
      {/if}
    </div>
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
  
  .radar-controls {
    position: absolute;
    bottom: 20px;
    right: 20px;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 8px;
    padding: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 1000;
  }
  
  .control-button {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 36px;
    height: 36px;
  }
  
  .control-button:hover {
    background-color: #f5f5f5;
  }
  
  .control-button.active {
    background-color: #e6f7ff;
    border-color: #1890ff;
    color: #1890ff;
  }
  
  .frame-info {
    display: flex;
    flex-direction: column;
    font-size: 0.8em;
    color: #333;
  }
  
  .frame-count {
    font-weight: bold;
  }
  
  .frame-time {
    color: #666;
  }
</style>

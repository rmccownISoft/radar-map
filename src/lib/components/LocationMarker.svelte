<script>
  import { onMount, onDestroy } from 'svelte';
  import L from 'leaflet';
  import { location, trackingStatus } from '../stores/locationStore';
  
  // Props
  export let map; // Leaflet map instance
  export let followPosition = true; // Whether to center map on position updates
  
  // State
  let positionMarker = null;
  let accuracyCircle = null;
  let currentPosition = null;
  
  // Dispatch custom events
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  
  // Custom marker icon
  const createLocationIcon = () => {
    return L.divIcon({
      className: 'location-marker',
      html: `<div class="marker-dot"></div>
             <div class="marker-pulse"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };
  
  // Subscribe to location store changes
  $: if ($location && $location.coords && map) {
    updateMarker($location.coords, $location.accuracy);
  }
  
  // State to track if we've done the initial zoom
  let initialZoomDone = false;
  
  // Update marker position and accuracy circle
  function updateMarker(position, accuracy) {
    currentPosition = position;
    
    // Create or update position marker
    if (!positionMarker) {
      positionMarker = L.marker(currentPosition, {
        icon: createLocationIcon(),
        zIndexOffset: 1000
      }).addTo(map);
    } else {
      positionMarker.setLatLng(currentPosition);
    }
    
    // Create or update accuracy circle
    if (!accuracyCircle) {
      accuracyCircle = L.circle(currentPosition, {
        radius: accuracy,
        color: '#4285F4',
        fillColor: '#4285F4',
        fillOpacity: 0.15,
        weight: 1
      }).addTo(map);
    } else {
      accuracyCircle.setLatLng(currentPosition);
      accuracyCircle.setRadius(accuracy);
    }
    
    // Center map on position if followPosition is true
    if (followPosition && map) {
      // If this is the first position update, set a more appropriate zoom level
      if (!initialZoomDone) {
        console.log('Setting initial zoom to level 10');
        map.setView(currentPosition, 10); // Zoom level 10 is good for city/regional view
        initialZoomDone = true;
      } else {
        map.setView(currentPosition);
      }
    }
    
    // Dispatch position update event
    dispatch('positionUpdate', {
      position: currentPosition,
      accuracy: accuracy
    });
  }
  
  // Watch for changes to followPosition
  $: if ($trackingStatus.isFollowing !== followPosition) {
    followPosition = $trackingStatus.isFollowing;
  }
  
  // Update view when followPosition changes
  $: if (followPosition && currentPosition && map) {
    map.setView(currentPosition);
  }
  
  // Clean up on component destroy
  onDestroy(() => {
    if (map) {
      if (positionMarker) map.removeLayer(positionMarker);
      if (accuracyCircle) map.removeLayer(accuracyCircle);
    }
  });
</script>

<style>
  :global(.location-marker) {
    position: relative;
  }
  
  :global(.marker-dot) {
    width: 12px;
    height: 12px;
    background-color: #4285F4;
    border: 2px solid white;
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
  }
  
  :global(.marker-pulse) {
    width: 24px;
    height: 24px;
    background-color: rgba(66, 133, 244, 0.4);
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% {
      transform: translate(-50%, -50%) scale(0.5);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) scale(1.5);
      opacity: 0;
    }
  }
</style>

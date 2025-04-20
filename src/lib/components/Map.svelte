<script>
  import { onMount, onDestroy } from 'svelte';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  
  // Props
  export let center = [39.8283, -98.5795]; // Default center of US
  export let zoom = 5; // Default zoom level, will be overridden by LocationMarker when position is available
  export let mapId = 'map';
  
  // Map instance
  let map;
  let mapElement;
  
  // Dispatch custom events
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  
  onMount(() => {
    // Initialize the map
    map = L.map(mapElement, {
      center: center,
      zoom: zoom,
      zoomControl: true,
      attributionControl: true
    });
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);
    
    // Dispatch the map instance to parent components
    dispatch('mapReady', { map });
    
    // Handle map move events
    map.on('moveend', () => {
      const newCenter = map.getCenter();
      const newZoom = map.getZoom();
      dispatch('mapMove', { 
        center: [newCenter.lat, newCenter.lng], 
        zoom: newZoom,
        bounds: map.getBounds()
      });
    });
  });
  
  onDestroy(() => {
    // Clean up the map instance when component is destroyed
    if (map) {
      map.remove();
    }
  });
  
  // Method to update the map view
  export function setView(newCenter, newZoom) {
    if (map) {
      map.setView(newCenter, newZoom);
    }
  }
  
  // Method to fit bounds
  export function fitBounds(bounds) {
    if (map) {
      map.fitBounds(bounds);
    }
  }
</script>

<div bind:this={mapElement} id={mapId} class="map-container"></div>

<style>
  .map-container {
    width: 100%;
    height: 100%;
    z-index: 1;
  }
  
  /* Import Leaflet CSS */
  :global(.leaflet-container) {
    height: 100%;
    width: 100%;
  }
  
  /* Fix for zoom control buttons - center the characters */
  .map-container :global(.leaflet-control-zoom-in),
  .map-container :global(.leaflet-control-zoom-out) {
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 26px;
    text-align: center;
  }
</style>

<script>
  import { onMount, onDestroy } from 'svelte';
  import '@picocss/pico/css/pico.min.css';
  import 'leaflet/dist/leaflet.css';
  
  // Import components
  import Map from './lib/components/Map.svelte';
  import LocationMarker from './lib/components/LocationMarker.svelte';
  import WeatherOverlay from './lib/components/WeatherOverlay.svelte';
  import Controls from './lib/components/Controls.svelte';
  import StormWarnings from './lib/components/StormWarnings.svelte';
  
  // Import stores
  import locationStore, { 
    startTracking, 
    stopTracking, 
    toggleFollowing,
    trackingStatus
  } from './lib/stores/locationStore';
  
  import mapStore, { 
    setMapInstance, 
    updateMapView, 
    updateBounds 
  } from './lib/stores/mapStore';
  
  import weatherStore, { 
    initWeatherStore, 
    cleanupWeatherStore, 
    refreshWeather, 
    toggleRadar, 
    toggleAlerts,
    weatherStatus,
    alerts as weatherAlerts
  } from './lib/stores/weatherStore';
  
  import * as cacheService from './lib/services/cacheService';
  
  // State
  let map;
  let isOffline = !navigator.onLine;
  let formattedAlerts = [];
  let isAnimating = false;
  let weatherOverlayComponent;
  
  // Handle map ready event
  function handleMapReady(event) {
    map = event.detail.map;
    setMapInstance(map);
  }
  
  // Handle map move event
  function handleMapMove(event) {
    // Pass true for skipViewUpdate to prevent infinite recursion
    updateMapView(event.detail.center, event.detail.zoom, true);
    updateBounds(map);
  }
  
  // Handle tracking toggle
  function handleTrackingToggle(event) {
    if (event.detail.isTracking) {
      startTracking();
    } else {
      stopTracking();
    }
  }
  
  // Handle following toggle
  function handleFollowingToggle(event) {
    toggleFollowing(event.detail.isFollowing);
  }
  
  // Handle weather toggle
  function handleWeatherToggle(event) {
    toggleRadar(event.detail.showWeather);
  }
  
  // Handle refresh weather
  function handleRefreshWeather() {
    refreshWeather();
  }
  
  // Handle animation toggle
  function handleAnimationToggle(event) {
    if (weatherOverlayComponent) {
      isAnimating = weatherOverlayComponent.toggleAnimation();
    }
  }
  
  // Handle online/offline status
  function handleOnline() {
    isOffline = false;
  }
  
  function handleOffline() {
    isOffline = true;
  }
  
  // Format alerts for display
  $: {
    if ($weatherAlerts) {
      formattedAlerts = $weatherAlerts;
    }
  }
  
  // Initialize on mount
  onMount(async () => {
    // Initialize cache service
    await cacheService.initCache();
    
    // Initialize weather store
    initWeatherStore();
    
    // Set up online/offline listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial online status
    isOffline = !navigator.onLine;
    
    // Start location tracking automatically
    startTracking();
  });
  
  // Clean up on destroy
  onDestroy(() => {
    cleanupWeatherStore();
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  });
</script>

<main>
  <div class="app-container">
    <div class="map-container">
      <Map 
        on:mapReady={handleMapReady} 
        on:mapMove={handleMapMove}
      />
      
      {#if map}
        <LocationMarker 
          {map} 
          followPosition={$trackingStatus.isFollowing}
        />
        
        <WeatherOverlay 
          bind:this={weatherOverlayComponent}
          {map} 
          visible={$weatherStatus.radarVisible}
          on:animationStarted={() => isAnimating = true}
          on:animationStopped={() => isAnimating = false}
        />
        
        <StormWarnings 
          warnings={formattedAlerts} 
          visible={$weatherStatus.alertsVisible}
        />
      {/if}
      
      <Controls 
        isTracking={$trackingStatus.isTracking}
        isFollowing={$trackingStatus.isFollowing}
        showWeather={$weatherStatus.radarVisible}
        lastWeatherUpdate={$weatherStatus.lastUpdate}
        {isOffline}
        {isAnimating}
        on:trackingToggle={handleTrackingToggle}
        on:followingToggle={handleFollowingToggle}
        on:weatherToggle={handleWeatherToggle}
        on:refreshWeather={handleRefreshWeather}
        on:animationToggle={handleAnimationToggle}
      />
    </div>
  </div>
</main>

<style>
  /* Component-specific styles */
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0;
    margin: 0;
    height: 100vh;
    width: 100vw;
  }
  
  .app-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }
  
  .map-container {
    flex: 1;
    position: relative;
    height: 100%;
    width: 100%;
  }
</style>

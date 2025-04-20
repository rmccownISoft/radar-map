<script>
  import { createEventDispatcher } from 'svelte';
  
  // Props
  export let isTracking = false;
  export let isFollowing = false;
  export let showWeather = true;
  export let lastWeatherUpdate = null;
  export let isOffline = false;
  export let isAnimating = false;
  
  // Dispatch custom events
  const dispatch = createEventDispatcher();
  
  // Handle tracking toggle
  function toggleTracking() {
    isTracking = !isTracking;
    dispatch('trackingToggle', { isTracking });
  }
  
  // Handle following toggle
  function toggleFollowing() {
    isFollowing = !isFollowing;
    dispatch('followingToggle', { isFollowing });
  }
  
  // Handle weather toggle
  function toggleWeather() {
    showWeather = !showWeather;
    dispatch('weatherToggle', { showWeather });
  }
  
  // Handle refresh weather
  function refreshWeather() {
    dispatch('refreshWeather');
  }
  
  // Handle animation toggle
  function toggleAnimation() {
    isAnimating = !isAnimating;
    dispatch('animationToggle', { isAnimating });
  }
  
  // Format date for display
  function formatDate(date) {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // If less than a minute ago
    if (diff < 60000) {
      return 'Just now';
    }
    
    // If less than an hour ago
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    
    // Otherwise show time
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="controls-container">
  <div class="control-group">
    <button 
      class="control-button {isTracking ? 'active' : ''}" 
      on:click={toggleTracking}
      title="{isTracking ? 'Stop tracking location' : 'Start tracking location'}"
    >
      <span class="icon">{isTracking ? '📍' : '🔍'}</span>
      <span class="label">{isTracking ? 'Tracking' : 'Track'}</span>
    </button>
    
    <button 
      class="control-button {isFollowing ? 'active' : ''}" 
      on:click={toggleFollowing}
      disabled={!isTracking}
      title="{isFollowing ? 'Stop following location' : 'Follow location'}"
    >
      <span class="icon">🔄</span>
      <span class="label">{isFollowing ? 'Following' : 'Follow'}</span>
    </button>
  </div>
  
  <div class="control-group">
    <button 
      class="control-button {showWeather ? 'active' : ''}" 
      on:click={toggleWeather}
      title="{showWeather ? 'Hide weather' : 'Show weather'}"
    >
      <span class="icon">🌦️</span>
      <span class="label">{showWeather ? 'Weather On' : 'Weather Off'}</span>
    </button>
    
    <button 
      class="control-button" 
      on:click={refreshWeather}
      disabled={!showWeather || isOffline}
      title="Refresh weather data"
    >
      <span class="icon">🔄</span>
      <span class="label">Refresh</span>
    </button>
  </div>
  
  <div class="control-group">
    <button 
      class="control-button {isAnimating ? 'active' : ''}" 
      on:click={toggleAnimation}
      disabled={!showWeather || isOffline}
      title="{isAnimating ? 'Stop radar animation' : 'Play radar animation'}"
    >
      <span class="icon">{isAnimating ? '⏸️' : '▶️'}</span>
      <span class="label">{isAnimating ? 'Stop Loop' : 'Loop Radar'}</span>
    </button>
  </div>
  
  {#if showWeather && lastWeatherUpdate}
    <div class="status-info">
      <span>Last updated: {formatDate(lastWeatherUpdate)}</span>
    </div>
  {/if}
  
  {#if isOffline}
    <div class="offline-indicator">
      <span class="icon">📵</span>
      <span>Offline Mode</span>
    </div>
  {/if}
</div>

<style>
  .controls-container {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 8px;
    padding: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 200px;
  }
  
  .control-group {
    display: flex;
    gap: 5px;
  }
  
  .control-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 8px;
    cursor: pointer;
    flex: 1;
    transition: all 0.2s ease;
  }
  
  .control-button:hover {
    background-color: #f5f5f5;
  }
  
  .control-button.active {
    background-color: #e6f7ff;
    border-color: #1890ff;
    color: #1890ff;
  }
  
  .control-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .icon {
    font-size: 1.2em;
    margin-bottom: 4px;
  }
  
  .label {
    font-size: 0.8em;
    white-space: nowrap;
  }
  
  .status-info {
    font-size: 0.8em;
    color: #666;
    text-align: center;
    margin-top: 5px;
  }
  
  .offline-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    background-color: #fff2e8;
    border: 1px solid #ffbb96;
    color: #fa541c;
    padding: 5px;
    border-radius: 5px;
    font-size: 0.8em;
    margin-top: 5px;
  }
</style>

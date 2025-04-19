<script>
  import { onMount, onDestroy } from 'svelte';
  import { slide } from 'svelte/transition';
  
  // Props
  export let warnings = [];
  export let visible = true;
  
  // State
  let expanded = false;
  let activeWarningIndex = 0;
  let intervalId;
  
  // Auto-rotate warnings if there are multiple
  onMount(() => {
    if (warnings.length > 1) {
      startRotation();
    }
  });
  
  // Watch for changes to warnings
  $: if (warnings.length > 1 && !intervalId) {
    startRotation();
  } else if (warnings.length <= 1 && intervalId) {
    stopRotation();
  }
  
  // Start rotating through warnings
  function startRotation() {
    stopRotation(); // Clear any existing interval
    
    intervalId = setInterval(() => {
      if (!expanded) { // Only rotate if not expanded
        activeWarningIndex = (activeWarningIndex + 1) % warnings.length;
      }
    }, 5000); // Rotate every 5 seconds
  }
  
  // Stop rotating through warnings
  function stopRotation() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
  
  // Toggle expanded view
  function toggleExpanded() {
    expanded = !expanded;
    
    // Stop rotation when expanded, restart when collapsed
    if (expanded) {
      stopRotation();
    } else if (warnings.length > 1) {
      startRotation();
    }
  }
  
  // Format date for display
  function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Get warning severity class
  function getSeverityClass(event) {
    const severityMap = {
      'Tornado Warning': 'extreme',
      'Severe Thunderstorm Warning': 'severe',
      'Flash Flood Warning': 'moderate',
      'Flood Warning': 'moderate',
      'Winter Storm Warning': 'moderate',
      'Hurricane Warning': 'extreme'
    };
    
    return severityMap[event] || 'normal';
  }
  
  // Clean up on component destroy
  onDestroy(() => {
    stopRotation();
  });
</script>

{#if visible && warnings.length > 0}
  <div class="warnings-container" class:expanded>
  <div 
    class="warnings-header" 
    on:click={toggleExpanded}
    on:keydown={(e) => e.key === 'Enter' && toggleExpanded()}
    role="button"
    tabindex="0"
    aria-expanded={expanded}
    aria-controls="warnings-list"
  >
      <div class="warning-count">
        <span class="icon">⚠️</span>
        <span>{warnings.length} Active Warning{warnings.length !== 1 ? 's' : ''}</span>
      </div>
      <span class="expand-icon">{expanded ? '▼' : '▲'}</span>
    </div>
    
    {#if expanded}
      <div class="warnings-list" transition:slide={{ duration: 300 }}>
        {#each warnings as warning, i}
          <div class="warning-item severity-{getSeverityClass(warning.properties.event)}">
            <div class="warning-title">{warning.properties.event}</div>
            <div class="warning-time">
              <span>Until: {formatDate(warning.properties.expires)}</span>
            </div>
            <div class="warning-description">
              {warning.properties.headline}
            </div>
            {#if warning.properties.url}
              <a 
                href={warning.properties.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                class="warning-link"
              >
                More details
              </a>
            {/if}
          </div>
        {/each}
      </div>
    {:else if warnings.length > 0}
      <div class="active-warning severity-{getSeverityClass(warnings[activeWarningIndex].properties.event)}">
        <div class="warning-title">{warnings[activeWarningIndex].properties.event}</div>
        <div class="warning-time">
          <span>Until: {formatDate(warnings[activeWarningIndex].properties.expires)}</span>
        </div>
        {#if warnings.length > 1}
          <div class="warning-pagination">
            {activeWarningIndex + 1} of {warnings.length}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .warnings-container {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    max-width: 400px;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    overflow: hidden;
    transition: all 0.3s ease;
  }
  
  .warnings-container.expanded {
    max-height: 70vh;
    overflow-y: auto;
  }
  
  .warnings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    background-color: #f8f8f8;
    border-bottom: 1px solid #eee;
    cursor: pointer;
  }
  
  .warning-count {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: bold;
  }
  
  .icon {
    font-size: 1.2em;
  }
  
  .expand-icon {
    color: #666;
  }
  
  .warnings-list {
    max-height: 60vh;
    overflow-y: auto;
  }
  
  .warning-item, .active-warning {
    padding: 12px 15px;
    border-bottom: 1px solid #eee;
  }
  
  .warning-title {
    font-weight: bold;
    margin-bottom: 5px;
  }
  
  .warning-time {
    font-size: 0.8em;
    color: #666;
    margin-bottom: 8px;
  }
  
  .warning-description {
    font-size: 0.9em;
    margin-bottom: 8px;
    line-height: 1.4;
  }
  
  .warning-link {
    display: inline-block;
    font-size: 0.8em;
    color: #1890ff;
    text-decoration: none;
  }
  
  .warning-pagination {
    font-size: 0.8em;
    color: #666;
    text-align: center;
    margin-top: 5px;
  }
  
  /* Severity styles */
  .severity-extreme {
    border-left: 4px solid #ff4d4f;
    background-color: #fff1f0;
  }
  
  .severity-severe {
    border-left: 4px solid #fa8c16;
    background-color: #fff7e6;
  }
  
  .severity-moderate {
    border-left: 4px solid #faad14;
    background-color: #fffbe6;
  }
  
  .severity-normal {
    border-left: 4px solid #52c41a;
    background-color: #f6ffed;
  }
</style>

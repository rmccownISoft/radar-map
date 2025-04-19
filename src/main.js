import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { registerServiceWorker } from './lib/services/serviceWorkerRegistration'

// Register service worker for offline capabilities
registerServiceWorker().catch(error => {
  console.error('Service worker registration failed:', error)
})

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app

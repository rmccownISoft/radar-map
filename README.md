# Radar Map

A lightweight, mobile-friendly web application for tracking your location relative to weather radar and storm warnings.

## Features

- **Interactive Map**: Powered by Leaflet.js and OpenStreetMap
- **GPS Location Tracking**: Real-time location tracking with accuracy indicators
- **Weather Radar Overlay**: Live weather radar data from the National Weather Service
- **Storm Warnings**: Real-time storm warnings and alerts
- **Offline Capabilities**: Service worker for caching map tiles and weather data
- **Mobile-Friendly**: Responsive design optimized for mobile devices
- **PWA Support**: Can be installed as a Progressive Web App

## Technology Stack

- **Frontend Framework**: Svelte 5
- **Build System**: Vite
- **Maps**: Leaflet.js with OpenStreetMap
- **Geolocation**: Browser's Geolocation API
- **Weather Data**: National Weather Service API
- **Caching**: Service Workers for offline capabilities
- **Styling**: Minimal CSS with Pico.css

## Project Structure

```
radar-map/
├── public/
│   ├── service-worker.js  # Service worker for offline capabilities
│   ├── manifest.json      # Web app manifest for PWA support
│   └── vite.svg           # Favicon
├── src/
│   ├── lib/
│   │   ├── components/    # Svelte components
│   │   ├── services/      # Service modules
│   │   └── stores/        # Svelte stores for state management
│   ├── App.svelte         # Main application component
│   └── main.js            # Application entry point
└── index.html             # HTML entry point
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/radar-map.git
   cd radar-map
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```
npm run build
```

The built files will be in the `dist` directory and can be deployed to any static hosting service.

## Usage

- **Map Navigation**: Pan and zoom the map using touch gestures or mouse controls
- **Location Tracking**: Click the "Track" button to start tracking your location
- **Weather Toggle**: Click the "Weather" button to toggle weather radar visibility
- **Warnings**: Weather warnings will appear at the bottom of the screen when available

## Offline Support

The application uses service workers to cache map tiles and weather data for offline use. Once you've visited an area, the map tiles for that area will be cached and available offline.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Svelte](https://svelte.dev/) - Frontend framework
- [Leaflet](https://leafletjs.com/) - Interactive maps
- [OpenStreetMap](https://www.openstreetmap.org/) - Map data
- [National Weather Service](https://www.weather.gov/) - Weather data
- [Pico.css](https://picocss.com/) - Minimal CSS framework

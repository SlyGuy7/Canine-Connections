// Vite build and dev-server configuration for the Canine Connections frontend.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Enables React JSX transform and fast-refresh during development.
  plugins: [react()],

  build: {
    rollupOptions: {
      output: {
        // Splits the production bundle into named chunks so browsers can cache
        // heavy libraries (React, Leaflet, STOMP) independently from app code.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          stomp: ['@stomp/stompjs'],
          map: ['leaflet', 'react-leaflet'],
        }
      }
    }
  },
  server: {
    // Binds to all network interfaces so the dev server is reachable on the local network.
    host: "0.0.0.0",
    port: 7012,
    strictPort: true,

    proxy: {
      // Forwards legacy REST auth requests to the local PHP backend on port 8000.
      "/auth": {
        target: "http://localhost:8000",
        changeOrigin: true
      },
      // Proxies WebSocket connections to the live RabbitMQ STOMP endpoint on the load balancer.
      // This means the dev server talks to the real RabbitMQ — no local broker needed.
      "/ws": {
        target: "ws://100.99.21.39:15674",
        ws: true,
        changeOrigin: true
      },
      // Proxies the client-IP lookup endpoint used by the login page for audit logging.
      "/client-ip": {
        target: "http://100.99.21.39",
        changeOrigin: true,
        xfwd: true
      }
    }
  }
})
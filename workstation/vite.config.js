import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          stomp: ['@stomp/stompjs'],
        }
      }
    }
  },
  server: {
    host: "0.0.0.0",
    port: 7012,
    strictPort: true,
    proxy: {
      "/auth": {
        target: "http://localhost:8000",
        changeOrigin: true
      },
      "/ws": {
        target: "ws://100.99.21.39:15674",
        ws: true,
        changeOrigin: true
      },
      "/client-ip": {
        target: "http://100.99.21.39",
        changeOrigin: true,
        xfwd: true
      }
    }
  }
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Bind to 0.0.0.0 to allow Docker container access
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        // Use environment variable for Docker, fallback to localhost for local dev
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})

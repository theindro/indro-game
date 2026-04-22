import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true
  },
  assetsInclude: ['**/*.png'], // Ensure PNG files are treated as assets
  optimizeDeps: {
    include: ['pixi.js']
  }
})

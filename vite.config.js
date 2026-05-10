import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
      plugins: [
        react(),
        {
          name: 'watch-debug',
          handleHotUpdate(ctx) {
            console.log('FILE CHANGED:', ctx.file)
          }
        }
      ],
  server: {
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
  assetsInclude: ['**/*.png'], // Ensure PNG files are treated as assets
})

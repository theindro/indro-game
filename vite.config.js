import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { devMonsterSavePlugin } from './scripts/devMonsterSavePlugin.js'

// https://vite.dev/config/
export default defineConfig({
      plugins: [
        react(),
        devMonsterSavePlugin(),
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

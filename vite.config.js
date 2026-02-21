import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// import { VitePWA } from 'vite-plugin-pwa' // disabled temporarily

export default defineConfig({
  build: {
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
          console.error('CIRCULAR:', warning.message);
        }
        defaultHandler(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase-vendor';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'framer-motion';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'charts';
          }
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    // PWA disabled temporarily — service worker was caching broken builds
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   strategies: 'injectManifest',
    //   srcDir: 'src',
    //   filename: 'sw.js',
    //   ...
    // }),
  ],
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// import { VitePWA } from 'vite-plugin-pwa' // disabled temporarily

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
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

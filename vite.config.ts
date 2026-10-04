import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    rollupOptions: {
      // Separar las librerías pesadas para que cada archivo se pueda guardar sin conexión
      output: { manualChunks: { firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'], xlsx: ['xlsx'] } },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon-32.png'],
      workbox: { maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 },
      manifest: {
        name: 'Tu punto de venta',
        short_name: 'Punto de venta',
        start_url: '/',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#111111',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});

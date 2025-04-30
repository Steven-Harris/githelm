import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  logLevel: 'info',
  build: {
    emptyOutDir: true,
    target: 'es2022',
  },
  plugins: [
    tailwindcss(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt', 
      scope: '/',
      base: '/',
      selfDestroying: false,
      includeAssets: ['favicon.ico', 'pwa-*.png', 'maskable-icon-*.png', 'apple-touch-icon-*.png'],
      manifest: {
        name: 'githelm',
        short_name: 'githelm',
        display: 'standalone',
        description: 'A repository monitoring application to manage pull requests and actions',
        theme_color: '#111827',
        background_color: '#111827',
        icons: [{
          src: 'pwa-64x64.png',
          sizes: '64x64',
          type: 'image/png',
        }, {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        }, {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        }, {
          src: 'maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        }],
      },
      workbox: {
          globDirectory: "./dev-dist",
          globIgnores: [
            "**/node_modules/**/*",
            "sw.js",
            "workbox-*.js"
          ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: '/',
      }
    }),
  ],
});


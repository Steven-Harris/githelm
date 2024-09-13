import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa'
import viteCompression from 'vite-plugin-compression';
import cssnano from 'cssnano';
import tailwindcss from 'tailwindcss'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,

      manifest: {
        name: 'githelm',
        short_name: 'githelm',
        description: 'A repository monitoring application to manage pull requests and actions',
        theme_color: '#111827',

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
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },

      devOptions: {
        enabled: false,
        navigateFallback: 'index.html',
        suppressWarnings: true,
        type: 'module',
      },
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        cssnano({
          preset: 'default',
        }),
      ],
    },
  },
  root: '.',
  build: {
    outDir: 'public',
    emptyOutDir: false,
    rollupOptions: {
      input: 'index.html',
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/analytics', 'firebase/auth', 'firebase/firestore'],
          sortable: ['sortablejs'],
        }
      }
    }
  },
  server: {
    hmr: true
  }
});
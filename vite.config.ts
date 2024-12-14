import { svelte } from '@sveltejs/vite-plugin-svelte';
import cssnano from 'cssnano';
import tailwindcss from 'tailwindcss';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
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
  },
  test: {
    css: true,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    setupFiles: "./vitest.setup.ts"
  },
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
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
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,

      pwaAssets: {
        disabled: false,
        config: true,
      },

      manifest: {
        name: 'githelm',
        short_name: 'githelm',
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
  ]
});
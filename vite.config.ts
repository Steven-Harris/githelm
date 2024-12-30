import { svelte } from '@sveltejs/vite-plugin-svelte';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import path from 'path';
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
    setupFiles: path.resolve(__dirname, ".config/vitest.setup.ts")
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss(path.resolve(__dirname, '.config/tailwind.config.ts')),
        autoprefixer(),
        cssnano({
          preset: 'default',
        }),
      ],
    },
  },
  resolve: {
    alias: {
      "@integrations": path.resolve(__dirname, './src/integrations'),
      "@services": path.resolve(__dirname, './src/services'),
      "@assets": path.resolve(__dirname, './src/assets'),
    },
  },
  plugins: [
    svelte({
      configFile: path.resolve(__dirname, '.config/svelte.config.js')
    }),
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
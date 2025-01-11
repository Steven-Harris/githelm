import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import path, { resolve } from 'path';
import tailwindcss from 'tailwindcss';
import type { UserConfig } from 'vite';


const config: UserConfig = {
  logLevel: 'info',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'src/assets',
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
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      srcDir: './src',
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      scope: '/',
      base: '/',
      selfDestroying: true,
      pwaAssets: {
        config: true,
      },
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
      injectManifest: {
        globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}']
      },
      workbox: {
        globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}']
      },
      devOptions: {
        enabled: false,
        suppressWarnings: process.env.SUPPRESS_WARNING === 'true',
        type: 'module',
        navigateFallback: '/',
      },
      kit: {
        includeVersionFile: true,
      }
    }),
  ],
  resolve: {
    alias: {
      "$lib/integrations": resolve(__dirname, 'src/integrations'),
    },
  }
};

export default config;
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import type { UserConfig } from 'vite';
import { defineConfig } from 'vite';

const config: UserConfig = defineConfig({
  logLevel: 'info',

  build: {
    emptyOutDir: true,
    sourcemap: true,
    // Improve build performance
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
  },

  // Optimize development server and caching
  server: {
    hmr: {
      overlay: true
    },
    fs: {
      strict: true
    }
  },

  // Enhanced dependency optimization
  optimizeDeps: {
    include: ['graphql'],
    exclude: [],
    esbuildOptions: {
      target: 'es2020'
    }
  },

  // Improved caching options
  cacheDir: 'node_modules/.vite',
  
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      srcDir: './src',
      strategies: 'generateSW',
      registerType: 'prompt', 
      scope: '/',
      base: '/',
      selfDestroying: false, 
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
      // Updated glob patterns for SvelteKit's static adapter output structure
      injectManifest: {
        globPatterns: ['**/*.{js,css,ico,png,svg,webp,woff,woff2}']
      },
      workbox: {
        // Updated glob patterns to match the actual output structure
        globPatterns: ['**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
        clientsClaim: true,
        skipWaiting: false,
        // Don't add globIgnores that might conflict with the build
        globIgnores: []
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
    }), sentryVitePlugin({
      org: "steven-harris-development",
      project: "githelm",
      
      // Auth token is loaded from environment variables
      authToken: process.env.SENTRY_AUTH_TOKEN,
      
      // Configure source maps uploading
      sourcemaps: {
        // Specify the directory containing source maps
        assets: "./dist/**",
        // Delete source maps after upload to reduce bundle size
        filesToDeleteAfterUpload: "./dist/**/*.map",
      },
      
      // Release information
      release: {
        // Use the Git commit hash as the release name for better tracking
        name: process.env.GITHUB_SHA || `githelm@${process.env.npm_package_version}`,
        // Add GitHub repository information for better error resolution
        ...(process.env.GITHUB_REPOSITORY ? {
          vcs: {
            repository: process.env.GITHUB_REPOSITORY,
            commit: process.env.GITHUB_SHA,
          }
        } : {})
      },
      
      // Only upload source maps during production builds
      // and not during local development
      telemetry: false,
      debug: process.env.NODE_ENV === 'development',
    })
  ]
});

export default config;
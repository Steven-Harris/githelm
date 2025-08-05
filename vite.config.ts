import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import type { UserConfig } from 'vite';
import { defineConfig } from 'vite';

// Helper to determine if Sentry should be enabled
function shouldEnableSentry() {
  // Disable in development mode
  if (process.env.NODE_ENV === 'development') {
    return false;
  }
  // Only enable when auth token is provided
  return Boolean(process.env.SENTRY_AUTH_TOKEN);
}

// Helper to determine the environment name
function getSentryEnvironment() {
  // For PR previews
  if (process.env.PR_NUMBER) {
    return `preview-pr-${process.env.PR_NUMBER}`;
  }

  // For explicit environment variable
  if (process.env.SENTRY_ENVIRONMENT) {
    return process.env.SENTRY_ENVIRONMENT;
  }

  // From GitHub environment
  if (process.env.GITHUB_REF) {
    if (process.env.GITHUB_REF.includes('main')) {
      return 'production';
    }
    return `branch-${process.env.GITHUB_REF.replace('refs/heads/', '')}`;
  }

  // Default
  return process.env.NODE_ENV || 'production';
}

// Configure release name
function getReleaseVersion() {
  // From GitHub Actions with branch info
  if (process.env.GITHUB_SHA) {
    let releaseName = `githelm@${process.env.GITHUB_SHA.substring(0, 8)}`;

    // Add branch name if available
    if (process.env.GITHUB_REF) {
      const branchName = process.env.GITHUB_REF.replace('refs/heads/', '').replace('refs/pull/', 'pr-');
      releaseName = `githelm@${branchName}-${process.env.GITHUB_SHA.substring(0, 8)}`;
    }

    // For pull requests, add PR number
    if (process.env.PR_NUMBER) {
      releaseName = `githelm@pr-${process.env.PR_NUMBER}-${process.env.GITHUB_SHA.substring(0, 8)}`;
    }

    return releaseName;
  }

  // From package version
  return `githelm@${process.env.npm_package_version || '2.0.0'}`;
}

const config: UserConfig = defineConfig({
  logLevel: 'info',

  build: {
    emptyOutDir: true,
    sourcemap: true,
    // Improve build performance
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    target: 'baseline-widely-available',
  },

  // Optimize development server and caching
  server: {
    hmr: {
      overlay: true,
    },
    fs: {
      strict: true,
    },
  },

  // Enhanced dependency optimization
  optimizeDeps: {
    include: ['graphql'],
    exclude: [],
    esbuildOptions: {
      target: 'es2020',
    },
  },

  // Improved caching options
  cacheDir: 'node_modules/.vite',

  // Define environment variables that will be available in the client code
  define: {
    // Pass environment information to the client
    'import.meta.env.VITE_IS_PR_PREVIEW': process.env.PR_NUMBER ? JSON.stringify('true') : JSON.stringify('false'),
    'import.meta.env.VITE_SENTRY_ENVIRONMENT': JSON.stringify(getSentryEnvironment()),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '2.0.0'),
  },

  plugins: [
    tailwindcss(),
    // Sentry SvelteKit plugin must come before sveltekit()
    ...(shouldEnableSentry()
      ? [
          sentrySvelteKit({
            sourceMapsUploadOptions: {
              org: 'steven-harris-development',
              project: 'githelm',
              authToken: process.env.SENTRY_AUTH_TOKEN,
              release: {
                name: getReleaseVersion(),
              },
            },
            // Auto-instrument load functions for better tracing
            autoInstrument: {
              load: true,
              serverLoad: true,
            },
          }),
        ]
      : []),
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
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // Configure workbox to properly handle SvelteKit's output structure
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,webp,woff,woff2}',
        ],
        globIgnores: [
          'node_modules/**/*',
          'dev-dist/**'
        ],
        clientsClaim: true,
        skipWaiting: true,
        // Handle SvelteKit's routing
        navigateFallback: '/',
        navigateFallbackDenylist: [/^\/_app\//, /^\/api\//],
      },
      devOptions: {
        enabled: false, // Enable PWA in development for testing
        suppressWarnings: process.env.SUPPRESS_WARNING === 'true',
        type: 'module',
        navigateFallback: '/',
      },
      kit: {
        includeVersionFile: true,
      },
    }),
  ],
});

export default config;

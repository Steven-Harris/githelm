import { sentryVitePlugin } from "@sentry/vite-plugin";
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
  // From GitHub Actions
  if (process.env.GITHUB_SHA) {
    return `githelm@${process.env.GITHUB_SHA.substring(0, 8)}`;
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
  
  // Define environment variables that will be available in the client code
  define: {
    // Pass environment information to the client
    'import.meta.env.VITE_IS_PR_PREVIEW': 
      process.env.PR_NUMBER ? JSON.stringify('true') : JSON.stringify('false'),
    'import.meta.env.VITE_SENTRY_ENVIRONMENT': 
      JSON.stringify(getSentryEnvironment()),
    'import.meta.env.VITE_APP_VERSION': 
      JSON.stringify(process.env.npm_package_version || '2.0.0'),
  },

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
    }),
    
    // Only add the Sentry plugin when needed
    ...(shouldEnableSentry() ? [
      sentryVitePlugin({
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
          // Use consistent release naming
          name: getReleaseVersion(),
          // Add GitHub repository information for better error resolution
          ...(process.env.GITHUB_REPOSITORY ? {
            vcs: {
              repository: process.env.GITHUB_REPOSITORY,
              commit: process.env.GITHUB_SHA,
            }
          } : {}),
          // Set commits configuration
          setCommits: {
            auto: true
          }
        },
        
        // Disable telemetry and enable debugging in development
        telemetry: false,
        debug: process.env.NODE_ENV === 'development',
      })
    ] : [])
  ]
});

export default config;
import { defineConfig } from 'cypress'
import { devServer } from '@cypress/vite-dev-server'

export default defineConfig({
  e2e: {
    // Enable E2E testing
    specPattern: 'src/**/*.e2e.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    baseUrl: 'http://localhost:5173',
    // Configure test discovery for co-located tests
    testIsolation: false,
    // Disable video recording for faster tests
    video: false,
    // Disable screenshots on failure for faster tests
    screenshotOnRunFailure: false,
    // Configure viewport for responsive testing
    viewportWidth: 1280,
    viewportHeight: 720,
    // Environment variables for testing
    env: {
      // Disable external integrations in tests
      DISABLE_SENTRY: 'true',
      DISABLE_FIREBASE: 'true',
      DISABLE_GITHUB: 'true',
      // Test-specific configuration
      TEST_MODE: 'true',
    },
  },
  // Component testing configuration
  component: {
    // Support for Svelte components
    devServer: {
      framework: 'svelte',
      bundler: 'vite',
    },
    // Configure test discovery for co-located tests
    specPattern: 'src/**/*.test.cy.ts',
    supportFile: 'cypress/support/component.ts',
    indexHtmlFile: 'cypress/support/component-index.html',
  },
  // Global configuration
  retries: {
    runMode: 2,
    openMode: 0,
  },
  // Disable video and screenshots for faster CI
  video: false,
  screenshotOnRunFailure: false,
})

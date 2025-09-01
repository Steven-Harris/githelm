// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add custom commands for Svelte component testing
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to mount a Svelte component
       * @example cy.mount(MyComponent, { props: { title: 'Hello' } })
       */
      mount(component: any, options?: any): Chainable<Element>
    }
  }
}

// Configure component testing
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // This is useful for handling expected errors in components
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  return true
})

// Global beforeEach hook for component tests
beforeEach(() => {
  // Disable Sentry globally for all component tests
  cy.window().then((win) => {
    if (win.Sentry) {
      win.Sentry.init = cy.stub().as('sentryInit')
      win.Sentry.captureException = cy.stub().as('sentryCaptureException')
      win.Sentry.captureMessage = cy.stub().as('sentryCaptureMessage')
    }
  })
})

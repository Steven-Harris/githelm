// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Configure E2E testing
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // This is useful for handling expected errors in E2E tests
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  return true
})

// Global beforeEach hook for E2E tests
beforeEach(() => {
  // Disable external integrations for testing
  cy.intercept('**/api.github.com/**', { statusCode: 200, body: {} }).as('github-api')
  cy.intercept('**/firebase/**', { statusCode: 200, body: {} }).as('firebase-api')
  cy.intercept('**/sentry/**', { statusCode: 200, body: {} }).as('sentry-api')
  
  // Disable Sentry globally for all tests
  cy.window().then((win) => {
    if (win.Sentry) {
      win.Sentry.init = cy.stub().as('sentryInit')
      win.Sentry.captureException = cy.stub().as('sentryCaptureException')
      win.Sentry.captureMessage = cy.stub().as('sentryCaptureMessage')
    }
  })
  
  // Stub console methods to reduce noise in tests
  cy.stub(console, 'log').as('consoleLog')
  cy.stub(console, 'warn').as('consoleWarn')
  cy.stub(console, 'error').as('consoleError')
})

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to mount Svelte components
Cypress.Commands.add('mount', (component, options = {}) => {
  // This will be implemented when we set up component testing
  // For now, it's a placeholder
  cy.log('Component mounting will be implemented')
})

// Custom command to stub GitHub API calls
Cypress.Commands.add('stubGithubAPI', (endpoint: string, response: any) => {
  cy.intercept(`**/api.github.com${endpoint}`, response).as(`github-${endpoint}`)
})

// Custom command to stub Firebase calls
Cypress.Commands.add('stubFirebase', (endpoint: string, response: any) => {
  cy.intercept(`**/firebase${endpoint}`, response).as(`firebase-${endpoint}`)
})

// Custom command to disable Sentry
Cypress.Commands.add('disableSentry', () => {
  cy.window().then((win) => {
    // Disable Sentry in the window object
    if (win.Sentry) {
      win.Sentry.init = cy.stub().as('sentryInit')
    }
  })
})

// Custom command to wait for external API calls
Cypress.Commands.add('waitForExternalAPIs', () => {
  cy.wait(['@github-api', '@firebase-api', '@sentry-api'])
})

// Custom command to clear test data
Cypress.Commands.add('clearTestData', () => {
  cy.window().then((win) => {
    // Clear localStorage
    win.localStorage.clear()
    // Clear sessionStorage
    win.sessionStorage.clear()
    // Clear any test-specific data
    if (win.testData) {
      win.testData = {}
    }
  })
})

// Extend Cypress types
declare global {
  namespace Cypress {
    interface Chainable {
      mount(component: any, options?: any): Chainable<Element>
      stubGithubAPI(endpoint: string, response: any): Chainable<null>
      stubFirebase(endpoint: string, response: any): Chainable<null>
      disableSentry(): Chainable<null>
      waitForExternalAPIs(): Chainable<null>
      clearTestData(): Chainable<null>
    }
  }
}

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

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
    if ((win as any).Sentry) {
      (win as any).Sentry.init = cy.stub().as('sentryInit')
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
    if ((win as any).testData) {
      (win as any).testData = {}
    }
  })
})

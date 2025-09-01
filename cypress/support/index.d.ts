/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to mount a Svelte component
       * @example cy.mount(MyComponent, { props: { title: 'Hello' } })
       */
      mount(component: any, options?: any): Chainable<Element>
      
      /**
       * Custom command to stub GitHub API calls
       * @example cy.stubGithubAPI('/repos', { data: [] })
       */
      stubGithubAPI(endpoint: string, response: any): Chainable<null>
      
      /**
       * Custom command to stub Firebase calls
       * @example cy.stubFirebase('/auth', { user: null })
       */
      stubFirebase(endpoint: string, response: any): Chainable<null>
      
      /**
       * Custom command to disable Sentry
       * @example cy.disableSentry()
       */
      disableSentry(): Chainable<null>
      
      /**
       * Custom command to wait for external API calls
       * @example cy.waitForExternalAPIs()
       */
      waitForExternalAPIs(): Chainable<null>
      
      /**
       * Custom command to clear test data
       * @example cy.clearTestData()
       */
      clearTestData(): Chainable<null>
    }
  }
  
  // Global test environment variables
  interface Window {
    TEST_MODE?: boolean
    DISABLE_SENTRY?: boolean
    DISABLE_FIREBASE?: boolean
    DISABLE_GITHUB?: boolean
    firebase?: any
    authService?: any
    configService?: any
    stores?: any
    repositoryCollapseStore?: any
    page?: any
  }
}

export {}

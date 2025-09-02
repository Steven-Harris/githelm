import Dashboard from './Dashboard.svelte'

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Disable external integrations for testing
    cy.disableSentry()
    
    // Stub stores
    cy.window().then((win) => {
      win.stores = {
        activeTab: 'pull-requests',
        isMobile: false
      }
    })
    
    // Stub child components to avoid complex dependencies
    cy.window().then((win) => {
      win.PullRequestsContainer = {
        render: () => '<div data-testid="pull-requests-container">Pull Requests</div>'
      }
      win.ActionsContainer = {
        render: () => '<div data-testid="actions-container">Actions</div>'
      }
    })
  })

  it('should render dashboard with content grid', () => {
    cy.mount(Dashboard)
    
    cy.get('#content').should('be.visible')
    cy.get('#content').should('have.class', 'grid')
    cy.get('#content').should('have.class', 'grid-cols-1')
    cy.get('#content').should('have.class', 'md:grid-cols-2')
  })

  it('should show both containers on desktop', () => {
    cy.window().then((win) => {
      win.stores.isMobile = false
    })
    
    cy.mount(Dashboard)
    
    cy.get('[data-testid="pull-requests-container"]').should('be.visible')
    cy.get('[data-testid="actions-container"]').should('be.visible')
  })

  it('should show only pull requests container on mobile when active tab is pull-requests', () => {
    cy.window().then((win) => {
      win.stores.isMobile = true
      win.stores.activeTab = 'pull-requests'
    })
    
    cy.mount(Dashboard)
    
    cy.get('[data-testid="pull-requests-container"]').should('be.visible')
    cy.get('[data-testid="actions-container"]').should('not.exist')
  })

  it('should show only actions container on mobile when active tab is actions', () => {
    cy.window().then((win) => {
      win.stores.isMobile = true
      win.stores.activeTab = 'actions'
    })
    
    cy.mount(Dashboard)
    
    cy.get('[data-testid="pull-requests-container"]').should('not.exist')
    cy.get('[data-testid="actions-container"]').should('be.visible')
  })

  it('should have proper spacing and layout classes', () => {
    cy.mount(Dashboard)
    
    cy.get('#content').should('have.class', 'mt-4')
    cy.get('#content').should('have.class', 'gap-4')
    cy.get('#content').should('have.class', 'sm:grid-cols-1')
  })

  it('should render RateLimitModal', () => {
    cy.mount(Dashboard)
    
    // The RateLimitModal should be present in the DOM
    cy.get('body').should('contain', 'RateLimitModal')
  })

  it('should handle tab switching on mobile', () => {
    cy.window().then((win) => {
      win.stores.isMobile = true
      win.stores.activeTab = 'pull-requests'
    })
    
    cy.mount(Dashboard)
    
    // Initially show pull requests
    cy.get('[data-testid="pull-requests-container"]').should('be.visible')
    cy.get('[data-testid="actions-container"]').should('not.exist')
    
    // Switch to actions tab
    cy.window().then((win) => {
      win.stores.activeTab = 'actions'
    })
    
    // Now show actions
    cy.get('[data-testid="pull-requests-container"]').should('not.exist')
    cy.get('[data-testid="actions-container"]').should('be.visible')
  })

  it('should maintain responsive grid layout on different screen sizes', () => {
    cy.mount(Dashboard)
    
    // Check responsive classes are applied
    cy.get('#content').should('have.class', 'grid-cols-1')
    cy.get('#content').should('have.class', 'md:grid-cols-2')
    cy.get('#content').should('have.class', 'sm:grid-cols-1')
  })
})

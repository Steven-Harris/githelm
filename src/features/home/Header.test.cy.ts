import { Header } from './Header.svelte'

describe('Header Component', () => {
  beforeEach(() => {
    // Disable external integrations for testing
    cy.disableSentry()
    
    // Stub Firebase user
    cy.window().then((win) => {
      win.firebase = {
        user: {
          displayName: 'Test User',
          photoURL: null,
          uid: 'test-user-123'
        }
      }
    })
    
    // Stub auth service
    cy.window().then((win) => {
      win.authService = {
        signOut: cy.stub().as('signOut')
      }
    })
    
    // Stub config service
    cy.window().then((win) => {
      win.configService = {
        navigateToDashboard: cy.stub().as('navigateToDashboard'),
        enableKillSwitch: cy.stub().as('enableKillSwitch')
      }
    })
    
    // Stub stores
    cy.window().then((win) => {
      win.stores = {
        lastUpdated: 0,
        killSwitch: false,
        isLoading: false,
        isMobile: false
      }
    })
  })

  it('should display GitHelm logo and title', () => {
    cy.mount(Header, { props: { signedIn: true } })
    
    cy.get('img[alt="GitHelm logo"]').should('be.visible')
    cy.get('h1').should('contain.text', 'GitHelm')
  })

  it('should show user avatar when signed in', () => {
    cy.mount(Header, { props: { signedIn: true } })
    
    cy.get('.avatar-button').should('be.visible')
    cy.get('.avatar-fallback').should('contain.text', 'T')
  })

  it('should toggle user menu when avatar is clicked', () => {
    cy.mount(Header, { props: { signedIn: true } })
    
    // Menu should be closed initially
    cy.get('.menu').should('not.exist')
    
    // Click avatar to open menu
    cy.get('.avatar-button').click()
    cy.get('.menu').should('be.visible')
    
    // Click avatar again to close menu
    cy.get('.avatar-button').click()
    cy.get('.menu').should('not.exist')
  })

  it('should show settings and logout options in user menu', () => {
    cy.mount(Header, { props: { signedIn: true } })
    
    cy.get('.avatar-button').click()
    cy.get('.menu').should('be.visible')
    
    cy.get('.menu-item').should('have.length', 2)
    cy.get('.menu-item').first().should('contain.text', 'Settings')
    cy.get('.menu-item').last().should('contain.text', 'Logout')
  })

  it('should call logout function when logout is clicked', () => {
    cy.mount(Header, { props: { signedIn: true } })
    
    cy.get('.avatar-button').click()
    cy.get('.menu-item').contains('Logout').click()
    
    cy.get('@signOut').should('have.been.called')
  })

  it('should show refresh button when not on config page', () => {
    cy.mount(Header, { props: { signedIn: true } })
    
    cy.get('button[aria-label="refresh data"]').should('be.visible')
    cy.get('button[aria-label="refresh data"]').should('contain.text', 'Refresh')
  })

  it('should show dashboard button when on config page', () => {
    // Mock being on config page
    cy.window().then((win) => {
      win.page = { url: { pathname: '/config' } }
    })
    
    cy.mount(Header, { props: { signedIn: true } })
    
    cy.get('button[aria-label="dashboard"]').should('be.visible')
    cy.get('button[aria-label="dashboard"]').should('contain.text', 'Dashboard')
  })

  it('should not show user menu when not signed in', () => {
    cy.mount(Header, { props: { signedIn: false } })
    
    cy.get('.avatar-button').should('not.exist')
    cy.get('.menu').should('not.exist')
  })

  it('should close menu when clicking outside', () => {
    cy.mount(Header, { props: { signedIn: true } })
    
    // Open menu
    cy.get('.avatar-button').click()
    cy.get('.menu').should('be.visible')
    
    // Click outside menu
    cy.get('body').click(0, 0)
    cy.get('.menu').should('not.exist')
  })

  it('should close menu when pressing Escape key', () => {
    cy.mount(Header, { props: { signedIn: true } })
    
    // Open menu
    cy.get('.avatar-button').click()
    cy.get('.menu').should('be.visible')
    
    // Press Escape key
    cy.get('body').type('{esc}')
    cy.get('.menu').should('not.exist')
  })

  it('should show loading state on refresh button when loading', () => {
    cy.window().then((win) => {
      win.stores.isLoading = true
    })
    
    cy.mount(Header, { props: { signedIn: true } })
    
    cy.get('button[aria-label="refresh data"]').should('contain.text', 'Loading...')
    cy.get('button[aria-label="refresh data"] .animate-spin').should('be.visible')
  })

  it('should disable refresh button when kill switch is enabled', () => {
    cy.window().then((win) => {
      win.stores.killSwitch = true
    })
    
    cy.mount(Header, { props: { signedIn: true } })
    
    cy.get('button[aria-label="refresh data"]').should('be.disabled')
  })
})

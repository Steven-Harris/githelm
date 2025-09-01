import RepositoryCard from './RepositoryCard.svelte'

describe('RepositoryCard Component', () => {
  const mockPullRequests = [
    {
      id: 1,
      number: 123,
      title: 'Add new feature',
      html_url: 'https://github.com/test/repo/pull/123',
      user: {
        login: 'testuser',
        avatar_url: 'https://github.com/testuser.png'
      },
      createdAt: '2 days ago'
    },
    {
      id: 2,
      number: 124,
      title: 'Fix bug in component',
      html_url: 'https://github.com/test/repo/pull/124',
      user: {
        login: 'anotheruser',
        avatar_url: null
      },
      createdAt: '1 day ago'
    }
  ]

  beforeEach(() => {
    // Stub repository collapse store
    cy.window().then((win) => {
      win.repositoryCollapseStore = {
        toggle: cy.stub().as('toggleCollapse'),
        isCollapsed: cy.stub().returns(false).as('isCollapsed')
      }
    })
  })

  it('should render repository header with correct information', () => {
    cy.mount(RepositoryCard, {
      props: {
        org: 'testorg',
        repo: 'testrepo',
        isLoaded: true,
        hasPRs: true,
        pullRequests: mockPullRequests
      }
    })
    
    cy.get('h3').should('contain.text', 'testrepo')
    cy.get('a[href*="github.com/testorg/testrepo"]').should('be.visible')
    cy.get('img[alt="GitHub"]').should('be.visible')
  })

  it('should show collapse/expand button with correct icon', () => {
    cy.mount(RepositoryCard, {
      props: {
        org: 'testorg',
        repo: 'testrepo',
        isLoaded: true,
        hasPRs: true,
        pullRequests: mockPullRequests
      }
    })
    
    // Initially expanded (chevron down)
    cy.get('button[title="Collapse repository"]').should('be.visible')
    cy.get('svg').should('contain', 'M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z')
  })

  it('should show expand button when collapsed', () => {
    cy.window().then((win) => {
      win.repositoryCollapseStore.isCollapsed = cy.stub().returns(true).as('isCollapsed')
    })
    
    cy.mount(RepositoryCard, {
      props: {
        org: 'testorg',
        repo: 'testrepo',
        isLoaded: true,
        hasPRs: true,
        pullRequests: mockPullRequests
      }
    })
    
    cy.get('button[title="Expand repository"]').should('be.visible')
    cy.get('svg').should('contain', 'M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z')
  })

  it('should call toggle function when collapse button is clicked', () => {
    cy.mount(RepositoryCard, {
      props: {
        org: 'testorg',
        repo: 'testrepo',
        isLoaded: true,
        hasPRs: true,
        pullRequests: mockPullRequests
      }
    })
    
    cy.get('button[title="Collapse repository"]').click()
    cy.get('@toggleCollapse').should('have.been.calledWith', 'testorg/testrepo')
  })

  it('should show pull request count badge when loaded', () => {
    cy.mount(RepositoryCard, {
      props: {
        org: 'testorg',
        repo: 'testrepo',
        isLoaded: true,
        hasPRs: true,
        pullRequests: mockPullRequests
      }
    })
    
    cy.get('[data-testid="count-badge"]').should('be.visible')
    cy.get('[data-testid="count-badge"]').should('contain.text', '2')
  })

  it('should show loading state when not loaded', () => {
    cy.mount(RepositoryCard, {
      props: {
        org: 'testorg',
        repo: 'testrepo',
        isLoaded: false,
        hasPRs: false,
        pullRequests: []
      }
    })
    
    cy.get('.text-sm').should('contain.text', 'Loading...')
    cy.get('svg.animate-spin').should('be.visible')
  })

  it('should display pull requests when expanded and loaded', () => {
    cy.mount(RepositoryCard, {
      props: {
        org: 'testorg',
        repo: 'testrepo',
        isLoaded: true,
        hasPRs: true,
        pullRequests: mockPullRequests
      }
    })
    
    cy.get('.divide-y').should('be.visible')
    cy.get('.divide-y > div').should('have.length', 2)
    
    // Check first PR
    cy.get('.divide-y > div').first().should('contain.text', 'Add new feature')
    cy.get('.divide-y > div').first().should('contain.text', '#123')
    cy.get('.divide-y > div').first().should('contain.text', 'testuser')
    
    // Check second PR
    cy.get('.divide-y > div').last().should('contain.text', 'Fix bug in component')
    cy.get('.divide-y > div').last().should('contain.text', '#124')
    cy.get('.divide-y > div').last().should('contain.text', 'anotheruser')
  })

  it('should show user avatar when available', () => {
    cy.mount(RepositoryCard, {
      props: {
        org: 'testorg',
        repo: 'testrepo',
        isLoaded: true,
        hasPRs: true,
        pullRequests: mockPullRequests
      }
    })
    
    // First PR has avatar
    cy.get('.divide-y > div').first().find('img.avatar').should('be.visible')
    cy.get('.divide-y > div').first().find('img.avatar').should('have.attr', 'src', 'https://github.com/testuser.png')
    
    // Second PR has fallback avatar
    cy.get('.divide-y > div').last().find('.avatar').should('be.visible')
    cy.get('.divide-y > div').last().find('.avatar svg').should('be.visible')
  })

  it('should have correct links to GitHub', () => {
    cy.mount(RepositoryCard, {
      props: {
        org: 'testorg',
        repo: 'testrepo',
        isLoaded: true,
        hasPRs: true,
        pullRequests: mockPullRequests
      }
    })
    
    // Repository link
    cy.get('a[href="https://github.com/testorg/testrepo/pulls"]').should('be.visible')
    
    // PR links
    cy.get('a[href="https://github.com/test/repo/pull/123"]').should('be.visible')
    cy.get('a[href="https://github.com/test/repo/pull/124"]').should('be.visible')
    
    // User links
    cy.get('a[href="https://github.com/testuser"]').should('be.visible')
    cy.get('a[href="https://github.com/anotheruser"]').should('be.visible')
  })

  it('should show filter hint when provided', () => {
    cy.mount(RepositoryCard, {
      props: {
        org: 'testorg',
        repo: 'testrepo',
        isLoaded: false,
        hasPRs: false,
        pullRequests: [],
        filterHint: 'draft pull requests'
      }
    })
    
    cy.get('.text-xs').should('contain.text', 'Checking for draft pull requests...')
  })

  it('should hide pull requests when collapsed', () => {
    cy.window().then((win) => {
      win.repositoryCollapseStore.isCollapsed = cy.stub().returns(true).as('isCollapsed')
    })
    
    cy.mount(RepositoryCard, {
      props: {
        org: 'testorg',
        repo: 'testrepo',
        isLoaded: true,
        hasPRs: true,
        pullRequests: mockPullRequests
      }
    })
    
    cy.get('.divide-y').should('not.exist')
  })
})

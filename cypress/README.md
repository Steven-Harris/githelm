# Cypress Testing for GitHelm

This directory contains Cypress tests for the GitHelm application, organized using a **co-located testing** approach.

## 🏗️ Test Organization

Tests are co-located with the components they test, following this structure:

```
src/features/home/
├── Header.svelte
├── Header.test.cy.ts        # Test alongside component
├── Tabs.svelte
├── Tabs.test.cy.ts
└── AppLayout.svelte
```

## 🚀 Running Tests

### Component Tests (Individual Components)
```bash
# Open Cypress component testing UI
pnpm cypress:component

# Run component tests in headless mode
pnpm test:cypress:component
```

### E2E Tests (Full Application)
```bash
# Open Cypress E2E testing UI
pnpm cypress:e2e

# Run E2E tests in headless mode
pnpm test:cypress
```

### All Tests
```bash
# Run all Cypress tests
pnpm test:cypress
```

## 📁 Test File Naming

- **Component Tests**: `*.test.cy.ts` (e.g., `Header.test.cy.ts`)
- **E2E Tests**: `*.e2e.cy.ts` (e.g., `auth.e2e.cy.ts`)

## 🔧 Test Configuration

### Environment Variables
Tests automatically disable external integrations:
- `DISABLE_SENTRY=true` - Sentry error reporting disabled
- `DISABLE_FIREBASE=true` - Firebase operations stubbed
- `DISABLE_GITHUB=true` - GitHub API calls intercepted

### Custom Commands
```typescript
// Disable Sentry
cy.disableSentry()

// Stub GitHub API
cy.stubGithubAPI('/repos', { data: [] })

// Stub Firebase
cy.stubFirebase('/auth', { user: null })

// Wait for external API calls
cy.waitForExternalAPIs()

// Clear test data
cy.clearTestData()
```

## 🧪 Writing Tests

### Component Test Example
```typescript
import { MyComponent } from './MyComponent.svelte'

describe('MyComponent', () => {
  beforeEach(() => {
    // Disable external integrations
    cy.disableSentry()
    
    // Stub dependencies
    cy.window().then((win) => {
      win.myService = cy.stub().as('myService')
    })
  })

  it('should render correctly', () => {
    cy.mount(MyComponent, { props: { title: 'Test' } })
    cy.get('h1').should('contain.text', 'Test')
  })
})
```

### E2E Test Example
```typescript
describe('Authentication Flow', () => {
  beforeEach(() => {
    // Stub external APIs
    cy.stubGithubAPI('/user', { login: 'testuser' })
    cy.stubFirebase('/auth', { user: null })
  })

  it('should allow user to sign in', () => {
    cy.visit('/')
    cy.get('[data-testid="signin-button"]').click()
    cy.url().should('include', '/dashboard')
  })
})
```

## 🎯 Test Coverage

### Current Test Coverage
- ✅ **Header Component** - Navigation, user menu, authentication
- ✅ **Dashboard Component** - Layout, responsive design, tab switching
- ✅ **RepositoryCard Component** - PR display, collapse/expand, loading states

### Planned Test Coverage
- 🔄 **Authentication Flow** - Login/logout, OAuth, session management
- 🔄 **Repository Management** - List, filter, search functionality
- 🔄 **Pull Request Operations** - View, filter, status updates
- 🔄 **Navigation & Layout** - Responsive design, tab navigation

## 🚫 External Integrations Stubbed

### GitHub API
- Repository data
- Pull request information
- User authentication
- GraphQL queries

### Firebase
- Authentication state
- Database operations
- User management

### Sentry
- Error reporting disabled
- Performance monitoring disabled
- Session replay disabled

## 🧹 Test Data Management

### Fixtures
Common test data is stored in `cypress/fixtures/test-data.json`:
- User profiles
- Repository information
- Pull request data
- API response templates

### Test Isolation
Each test runs in isolation:
- Clean localStorage/sessionStorage
- Reset component state
- Clear external API stubs

## 🔍 Debugging Tests

### Cypress UI
```bash
pnpm cypress:component  # For component tests
pnpm cypress:e2e        # For E2E tests
```

### Console Logs
Tests include console stubbing to reduce noise:
```typescript
cy.stub(console, 'log').as('consoleLog')
cy.stub(console, 'warn').as('consoleWarn')
cy.stub(console, 'error').as('consoleError')
```

### Network Interception
Monitor API calls:
```typescript
cy.intercept('**/api.github.com/**').as('github-api')
cy.wait('@github-api')
```

## 📊 CI/CD Integration

### GitHub Actions
Tests run automatically on:
- Pull requests
- Push to main branch
- Manual workflow dispatch

### Test Reports
- Cypress dashboard integration
- Screenshot capture on failure
- Video recording (disabled for performance)

## 🚀 Best Practices

1. **Co-locate tests** with components for better maintainability
2. **Stub external dependencies** to ensure test reliability
3. **Use data-testid attributes** for reliable element selection
4. **Test user interactions** not implementation details
5. **Keep tests focused** on single responsibility
6. **Use descriptive test names** that explain the behavior

## 🆘 Troubleshooting

### Common Issues

**Component not mounting:**
- Check import paths
- Verify component dependencies are stubbed
- Ensure proper test environment setup

**Tests failing intermittently:**
- Add proper waiting for async operations
- Use `cy.wait()` for network requests
- Check for race conditions

**External API calls not stubbed:**
- Verify intercept patterns match API endpoints
- Check environment variables are set
- Ensure stubs are configured before component mount

## 📚 Additional Resources

- [Cypress Documentation](https://docs.cypress.io/)
- [Svelte Component Testing](https://docs.cypress.io/guides/component-testing/svelte)
- [GitHelm Testing Strategy](./CYPRESS_IMPLEMENTATION_PLAN.md)

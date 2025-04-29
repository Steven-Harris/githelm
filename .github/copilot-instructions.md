# Copilot Instructions

## Project Overview

GitHelm is a web application designed to monitor GitHub pull requests and actions across multiple repositories. The application provides a user-friendly interface to authenticate with GitHub, configure repositories and actions to monitor, and view the status of pull requests and actions in real-time.

## Tech Stack

- **Frontend Framework**: Svelte 5
- **Language**: TypeScript
- **Authentication**: Firebase Authentication with GitHub provider
- **Data Storage**: Firebase Firestore
- **Local Storage**: Browser localStorage for caching API responses
- **API Integration**: GitHub REST API and GraphQL API
- **Styling**: TailwindCSS
- **Deployment**: Client-only deployment to Firebase Hosting
- **Build Tool**: Vite

## Application Architecture

### Core Components

1. **Authentication System**
   - Firebase authentication with GitHub provider
   - GitHub token management and auto-refresh
   - Auth state management with persistent local storage

2. **Data Fetching and Caching**
   - Polling mechanism to periodically fetch updates (60-second intervals)
   - Intelligent caching to prevent redundant API calls
   - Rate limit detection and handling
   - GraphQL integration for efficient batch requests

3. **User Interface**
   - Responsive design that works on mobile and desktop
   - Configuration management for repositories
   - Real-time status display for pull requests and actions
   - Last updated timestamp and manual refresh option

## Key Features

- **Monitor Pull Requests**: Configure and monitor pull requests across multiple repositories
- **Monitor GitHub Actions**: Configure and monitor GitHub action workflows across repositories
- **Filter Support**: Filter pull requests by labels and actions by workflow names
- **Real-time Updates**: Automatic polling with 60-second refresh intervals
- **Manual Refresh**: Option to manually trigger data refresh
- **User Authentication**: Secure login with GitHub

## Code Organization

### Core Modules

- **Firebase Integration** (`/src/integrations/firebase/`)
  - `client.ts`: Firebase authentication client
  - `config-service.ts`: Firestore integration for user configuration
  - `types.ts`: TypeScript interfaces for Firebase data

- **GitHub API Integration** (`/src/integrations/github/`)
  - `actions.ts`: Fetching and processing GitHub Actions data
  - `api-client.ts`: Core API client with fetch and GraphQL support
  - `auth.ts`: GitHub authentication token management
  - `pull-requests.ts`: Fetching and processing pull requests data
  - `repositories.ts`: Repository metadata handling

- **Storage Utilities** (`/src/integrations/storage.ts`)
  - Browser localStorage abstraction
  - Caching mechanisms for API responses

### UI Components

- **Core UI** (`/src/lib/`)
  - `Header.svelte`: Application header with authentication controls
  - `Footer.svelte`: Footer with last updated timestamp
  - `Tabs.svelte`: Navigation between pull requests and actions
  - `Loading.svelte`: Loading indicator

- **Pull Requests** (`/src/lib/pull-requests/`)
  - `Container.svelte`: Main container for pull requests view
  - `List.svelte`: List of pull requests for a repository
  - `Reviews.svelte`: Pull request reviews display

- **Actions** (`/src/lib/actions/`)
  - `Container.svelte`: Main container for actions view
  - `List.svelte`: List of workflow runs
  - `WorkflowRun.svelte`: Individual workflow run display

- **Configuration** (`/src/lib/config/`)

### State Management

- **Svelte Stores** (`/src/lib/stores/`)
  - `repository-service.ts`: Main repository data management
  - `polling.store.ts`: Polling mechanism for data refresh
  - `kill-switch.store.ts`: Rate limit handling
  - `active-tab.store.ts`: UI tab state
  - `last-updated.store.ts`: Last updated timestamp
  - `loading.store.ts`: Determines if the application is fetching data
  - `event-bus.store.ts`: Application-wide event bus
  - `mobile.store.ts`: Mobile device detection

## Development Setup

### Requirements

- Node.js (v18 or higher)
- pnpm (v9 or higher)
- GitHub account

### Installation

1. **Clone the repository**:
   ```sh
   git clone https://github.com/steven-harris/githelm.git
   cd githelm
   ```

2. **Install dependencies**:
   ```sh
   pnpm install
   ```

3. **Configure Firebase**:
   - Create a Firebase project
   - Enable GitHub authentication
   - Configure Firestore database
   - Set up Firebase Hosting
   - Update firebase configuration in `/src/integrations/firebase/client.ts`

4. **Start the development server**:
   ```sh
   pnpm run dev
   ```

## Authentication Flow

1. **Initial Authentication**:
   - User clicks "Login with GitHub" button
   - Firebase authentication opens GitHub OAuth popup
   - User grants permissions to the app
   - Firebase returns a user object and GitHub token
   - Token is stored in localStorage for subsequent requests

2. **Token Refresh**:
   - Token validity is checked on startup
   - Tokens are automatically refreshed when expired
   - Failed token refreshes trigger a re-authentication flow

## API Integration

### GitHub REST API

- Used for certain endpoints that aren't efficiently served by GraphQL
- Handles rate limiting with proper headers and backoff strategy
- Includes automatic retry with exponential backoff for failed requests

### GitHub GraphQL API

- Used for efficient batched requests (especially pull requests)
- Fetches multiple repositories' data in a single request
- Includes reviews data for pull requests
- Response transformation to match the application's data format

## Polling Mechanism

- Regular 60-second interval for data refresh
- Individual polling stores for each repository to avoid single point of failure
- Kill switch to stop polling when rate limits are detected
- Manual refresh trigger from the UI

## Common Issues and Solutions

### Rate Limiting

- The application detects rate limits through GitHub API responses
- When rate limits are hit, polling is temporarily disabled
- A modal informs the user of the rate limit situation
- Polling resumes automatically when the rate limit period ends

### Authentication Failures

- Token validation on startup detects invalid tokens
- Automatic re-authentication flow when tokens expire
- Clear error messages for authentication issues

### Data Caching Issues

- Each API client (REST and GraphQL) manages its own cache
- Cache invalidation on manual refresh
- Cache lifetime aligns with polling intervals

## Future Improvements

### Short-term Enhancements
- Redo configuration view and editing.
  - allow users to enter the organization they want to add configs for
  - save orgs in firestore
  - merge the configuration for pull-requests and actions into one form
  - allow users to select org when entering a repository from their configured orgs
  - provide autofill/search capabilities when defining a repo config
  - after selecting a repo, the user should see two toggles, one to enable watching pull requests and the other to enable watching actions
  - provide dropdown/search capabilities when defining a pull request configuration
  - provide dropdown/search capabilities when defining a action's workflow filter (a workflow filter is the file name of the workflow)
  - when the repo config is saved to firebase it should use the same schema as before
- fix drag-and-drop UI/UX of config editing.
  - drag-and-drop is currently supported, but it's a little cluncky. The user doesn't see the list adjust until they drop the config. 
  - users should see the configs move as they are draging the config
  - configs currently being drag should be displayed with a low opacity.
- Implement adjustable UI layouts

### Mid-term Features
- Condensed view of actions showing only issues/errors
- Expand/collapse functionality for pull requests and actions
- Integration of PR check statuses
- PR approval directly from the application

### Long-term Vision
- In-app PR viewing
- Inline code diff review
- PR comment capabilities from within the app

## Best Practices

### Performance Optimization

- Use GraphQL for batched requests
- Implement efficient caching to reduce API calls
- Lazy load components where appropriate
- Throttle user actions that trigger API calls

### Authentication Security

- Store tokens securely in localStorage
- Request only necessary GitHub permissions
- Implement proper token refresh mechanisms
- Clear sensitive data on logout

### Error Handling

- Graceful fallback for API failures
- Clear user feedback for authentication issues
- Console logging for debugging purposes
- Retry mechanisms for transient errors

### UI/UX Guidelines

- Consistent styling with TailwindCSS
- Mobile-first responsive design
- Clear loading states during data fetching
- Informative error messages

## Contributing

1. Create a feature branch from `svelte-kit`
2. Implement your changes adhering to the project's code style
3. Test thoroughly, especially API integration
4. Submit a PR with clear description of changes
5. Address review comments and ensure CI checks pass

## Testing

- Manual testing for UI components
- Console logging for API response debugging
- Verify authentication flow in development environment
- Test on both desktop and mobile viewports

## Deployment

- Build with `pnpm run build`
- Preview with `pnpm run preview`
- Deploy to Firebase Hosting with `firebase deploy`
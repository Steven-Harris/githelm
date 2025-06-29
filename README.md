# GitHelm

GitHelm is a web application designed to monitor GitHub pull requests and actions across multiple repositories. The application provides a user-friendly interface to authenticate with GitHub, configure repositories and actions to monitor, and view the status of pull requests and actions in real-time.

<a href="https://www.buymeacoffee.com/githelm" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 150px !important;" ></a>

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
- **Testing**: Vitest for unit testing, Playwright for E2E testing

## Using the Site

### Features

- **Monitor Pull Requests**: Configure and monitor pull requests across multiple repositories.
- **Monitor GitHub Actions**: Configure and monitor GitHub action workflows across repositories.
- **Filtering**: Add filters for pull requests (by labels) and actions (by workflow names).
- **Real-time Updates**: Automatically refresh the content every 60 seconds.
- **Manual Refresh**: Option to manually trigger data refresh.
- **Intelligent Caching**: Prevent redundant API calls with efficient caching.
- **Rate Limit Handling**: Detection and management of GitHub API rate limits.
- **Organization Management**: Configure and save organizations for easier repository selection.
- **Drag-and-Drop Configuration**: Reorder your monitored repositories with intuitive drag-and-drop.
- **Responsive Design**: Works seamlessly on both mobile and desktop.
- **Progressive Web App (PWA)**: Install the application for offline access.

#### Authentication

1. **Login**:

   - Click the "Login with GitHub" button.
   - Authenticate with your GitHub account.
   - Authorize any organization you wish to monitor.
   - Tokens are securely managed with automatic refresh when expired.

2. **Logout**:
   - Click the "Logout" button to sign out of the application.

#### Setting Up Repositories

1. **Add a Repository**:

   - Navigate to the "Pull Requests" or "Actions" section (or tabs if you're on mobile).
   - Click the "Edit" button to enter the configuration mode.
   - Select from your configured organizations or enter a new one.
   - Select or search for a repository name with autofill capabilities.
   - Enable toggles for watching pull requests and/or actions.
   - Add any filters (labels for pull requests or workflow names for actions) with dropdown/search support.
   - Click the "Add" button to add the repository to the configuration.

2. **Manage Organizations**:

   - Add and save organizations you frequently work with.
   - Organizations are stored in Firestore for persistent access.

3. **Reorder Configurations**:

   - Drag and drop repository configurations to reorder them.
   - Visual feedback shows the moving configuration with lowered opacity.

4. **Save Configuration**:
   - Click the "Save" button to save the configuration.
   - The repositories and actions will be monitored based on the configuration.

#### Adding Filters

1. **Add a Filter**:

   - In the configuration mode, search and select filters from available options.
   - Click the "Add Filter" button to add the filter.

2. **Remove a Filter**:
   - Click the "x" button next to the filter to remove it.

### Viewing Pull Requests and Actions

1. **Pull Requests**:

   - Navigate to the "Pull Requests" tab to view monitored pull requests.
   - Filter pull requests by repository using the repository filter.
   - View pull request titles, statuses, and review information.
   - Pull requests are automatically filtered by your configured label filters.

2. **Actions**:
   - Navigate to the "Actions" tab to view monitored GitHub Actions.
   - Filter actions by workflow status.
   - View workflow run details including status, conclusion, and timing.
   - Actions are automatically filtered by your configured workflow name filters.

### Real-time Updates and Caching

- The application automatically refreshes content every 60 seconds.
- Manual refresh option available by clicking the "Refresh" button in the footer.
- Intelligent caching prevents redundant API calls while ensuring fresh data.
- Rate limit detection pauses polling when GitHub API limits are approached.
- Last updated timestamp shows when data was last refreshed.

### Progressive Web App (PWA)

- Install the application as a PWA for offline access.
- Follow the browser prompts to install the application on your device.
- Receive update notifications when new versions are available.

## Architecture

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
   - Configuration management for repositories and organizations
   - Real-time status display for pull requests and actions
   - Last updated timestamp and manual refresh option

## Future Improvements

### Coming Soon

- Adjustable UI layouts
- Integration of PR check statuses

### Long-term Vision

- In-app PR viewing
- Inline code diff review
- PR comment capabilities from within the app

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Create a feature branch from `main`
2. Implement your changes adhering to the project's code style
3. Test thoroughly, especially API integration
4. Submit a PR with clear description of changes
5. Address review comments and ensure CI checks pass

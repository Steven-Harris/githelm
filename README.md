# GitHelm

GitHelm is a web application designed to monitor GitHub pull requests and actions across multiple repositories. The application provides a user-friendly interface to authenticate with GitHub, configure repositories and actions to monitor, and view the status of pull requests and actions in real-time.

<a href="https://www.buymeacoffee.com/githelm" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 150px !important;" ></a>

## Using the Site
### Features

- **Monitor Pull Requests**: Configure and monitor pull requests across multiple repositories.
- **Monitor Actions**: Configure and monitor GitHub actions across multiple repositories.
- **Filtering**: Add filters to pull requests and actions to narrow down the results.
- **Real-time Updates**: Automatically refresh the content every 60 seconds to provide real-time updates.
- **Progressive Web App (PWA)**: Install the application as a PWA for offline access.

#### Authentication

1. **Login**:
   - Click the "Login with GitHub" button.
   - Authenticate with your GitHub account.
   - Authorize any organization you wish to monitor.

2. **Logout**:
   - Click the "Logout" button to sign out of the application.

#### Setting Up Repositories

1. **Add a Repository**:
   - Navigate to the "Pull Requests" or "Actions" section (or tabs if you're on mobile).
   - Click the "Edit" button to enter the configuration mode.
   - Enter the organization and repository name.
   - Add any filters (labels for pull requests or workflow names for actions).
   - Click the "Add" button to add the repository to the configuration.

2. **Save Configuration**:
   - Click the "Save" button to save the configuration.
   - The repositories and actions will be monitored based on the configuration.

#### Adding Filters

1. **Add a Filter**:
   - In the configuration mode, enter the filter (label for pull requests or workflow name for actions).
   - Click the "Add Filter" button to add the filter.

2. **Remove a Filter**:
   - Click the "x" button next to the filter to remove it.

### Viewing Pull Requests and Actions

1. **Pull Requests**:
   - Navigate to the "Pull Requests" tab to view the list of monitored pull requests.
   - The pull requests will be displayed with their titles and statuses.

2. **Actions**:
   - Navigate to the "Actions" tab to view the list of monitored actions.
   - The actions will be displayed with their names and statuses.

### Real-time Updates

- The application will automatically refresh the content every 60 seconds to provide real-time updates.
- You can also manually refresh the content by clicking the "Refresh" button next to time timer located in the footer.

### Progressive Web App (PWA)

- You can install the application as a PWA for offline access.
- Follow the browser prompts to install the application on your device

## Development
### Requirements

- Node.js (v18 or higher)
- pnpm (v9 or higher)
- GitHub account

### Development Setup

1. **Install Dependencies**:

   ```sh
   pnpm install
   ```

2. **Run the Development Server**:

   ```sh
   pnpm dev
   ```

3. **Build the Application**:

   ```sh
   pnpm build
   ```

4. **Preview the Production Build**:

   ```sh
   pnpm serve
   ```


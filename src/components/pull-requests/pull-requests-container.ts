import { html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { AppElement } from '../base/app-element';
import { repositoryController, RepositoryController } from '../../controllers/repository.controller';
import { loadingController } from '../../controllers/loading.controller';
import { type PullRequest } from '../../integrations/github';
import { type RepoConfig } from '../../integrations/firebase';

// Import pull request components
import './pull-request-list-element';

/**
 * Pull Requests Container Component
 * Manages and displays pull requests for repositories
 * @element pull-requests-container
 */
@customElement('pull-requests-container')
export class PullRequestsContainer extends AppElement {
  @state() private pullRequestRepos: RepoConfig[] = [];
  @state() private pullRequests: Record<string, PullRequest[]> = {};

  static styles = css`
    :host {
      display: block;
    }

    .container {
      margin: 1rem 0;
    }

    .refresh-button {
      background-color: var(--primary-accent-color, #3b82f6);
      color: white;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: background-color 0.2s;
    }

    .refresh-button:hover {
      background-color: var(--primary-accent-hover-color, #2563eb);
    }

    .empty-state {
      padding: 2rem;
      text-align: center;
      background-color: var(--secondary-color, #374151);
      border-radius: 0.5rem;
      margin: 1rem 0;
    }
  `;

  constructor() {
    super();

    // Set up repository controller listeners
    this.addStoreListener(
      repositoryController,
      RepositoryController.PULL_REQUESTS_CHANGED,
      this._handlePullRequestsChanged as EventListener
    );

    this.addStoreListener(
      repositoryController,
      RepositoryController.PR_CONFIGS_CHANGED,
      this._handleConfigsChanged as EventListener
    );

    // Initialize data with copies to avoid direct controller property assignment
    this.pullRequestRepos = [...repositoryController.pullRequestRepos];
    this.pullRequests = { ...repositoryController.pullRequests };
  }

  private _handlePullRequestsChanged(e: CustomEvent): void {
    // Create a local copy of the pull requests object rather than trying to assign directly
    this.pullRequests = { ...e.detail.pullRequests };
    this.pullRequestRepos = repositoryController.pullRequestRepos;
  }

  private _handleConfigsChanged(): void {
    // Create a local copy of the pull request repos array
    this.pullRequestRepos = [...repositoryController.pullRequestRepos];
  }

  private async _refreshPullRequests(): Promise<void> {
    try {
      loadingController.startRequest();
      await repositoryController.refreshPullRequestsData(repositoryController.pullRequestConfigs);
    } catch (error) {
      console.error('Error refreshing pull requests:', error);
    } finally {
      loadingController.endRequest();
    }
  }

  render() {
    // Check if we have any pull request repos to display
    if (!this.pullRequestRepos.length) {
      return html`
        <div class="empty-state">
          <h2>No Pull Requests</h2>
          <p>You haven't configured any repositories for pull request monitoring yet.</p>
          <p>Use the configuration page to add repositories.</p>
        </div>
      `;
    }

    return html`
      <div class="container">
        <button @click=${this._refreshPullRequests} class="refresh-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          Refresh Pull Requests
        </button>

        ${this.pullRequestRepos.map(
          (config) => html`
            <pull-request-list-element
              .org=${config.org}
              .repo=${config.repo}
              .pullRequests=${this.pullRequests[repositoryController.getRepoKey(config)] || []}
            ></pull-request-list-element>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pull-requests-container': PullRequestsContainer;
  }
}
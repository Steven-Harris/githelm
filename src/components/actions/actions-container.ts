import { html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { AppElement } from '../base/app-element';
import { repositoryController, RepositoryController } from '../../controllers/repository.controller';
import { loadingController } from '../../controllers/loading.controller';
import { type WorkflowRun } from '../../integrations/github';
import { type RepoConfig } from '../../integrations/firebase';

// Import actions components
import './actions-list-element';

/**
 * Actions Container Component
 * Manages and displays GitHub Actions workflow runs for repositories
 * @element actions-container
 */
@customElement('actions-container')
export class ActionsContainer extends AppElement {
  @state() private actionRepos: RepoConfig[] = [];
  @state() private workflowRuns: Record<string, WorkflowRun[]> = {};

  static styles = css`
    :host {
      display: block;
    }

    section {
      background-color: var(--secondary-color, #1f2937);
      padding: 1.25rem;
      border-radius: 0.5rem;
    }

    h2 {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }

    .container {
      margin: 1rem 0;
    }

    .header {
      display: flex;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 10;
      background-color: var(--secondary-color, #1f2937);
    }

    .empty-state {
      padding: 1rem 0;
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
  `;

  constructor() {
    super();

    // Set up repository controller listeners
    this.addStoreListener(
      repositoryController,
      RepositoryController.WORKFLOW_RUNS_CHANGED,
      this._handleWorkflowRunsChanged as EventListener
    );

    this.addStoreListener(
      repositoryController,
      RepositoryController.ACTIONS_CONFIGS_CHANGED,
      this._handleConfigsChanged as EventListener
    );

    // Initialize state
    this.actionRepos = repositoryController.actionRepos;
    this.workflowRuns = repositoryController.workflowRuns;
  }

  private _handleWorkflowRunsChanged(e: CustomEvent): void {
    this.workflowRuns = e.detail.workflowRuns;
    this.actionRepos = repositoryController.actionRepos;
  }

  private _handleConfigsChanged(): void {
    this.actionRepos = repositoryController.actionRepos;
  }

  private async _refreshActions(): Promise<void> {
    try {
      loadingController.startRequest();
      await repositoryController.refreshActionsData(repositoryController.actionsConfigs);
    } catch (error) {
      console.error('Error refreshing actions data:', error);
    } finally {
      loadingController.endRequest();
    }
  }

  render() {
    return html`
      <section>
        <div class="header">
          <h2>Actions</h2>
          <button @click=${this._refreshActions} class="refresh-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            Refresh
          </button>
        </div>

        ${this.actionRepos.length === 0
          ? html`<p class="empty-state" id="actions-not-found">
              No actions found. Configure repositories in the Config tab.
            </p>`
          : this.actionRepos.map(
              (config) => html`
                <actions-list-element
                  .org=${config.org}
                  .repo=${config.repo}
                  .workflowRuns=${this.workflowRuns[repositoryController.getRepoKey(config)] || []}
                ></actions-list-element>
              `
            )}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'actions-container': ActionsContainer;
  }
}
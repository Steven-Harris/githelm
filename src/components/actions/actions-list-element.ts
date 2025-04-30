import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AppElement } from '../base/app-element';
import type { WorkflowRun, Job } from '../../integrations/github';
import { repositoryController } from '../../controllers/repository.controller';

// Import the WorkflowRunElement component
import './workflow-run-element';

/**
 * Actions List Component
 * Displays workflow runs for a specific repository
 * @element actions-list-element
 */
@customElement('actions-list-element')
export class ActionsListElement extends AppElement {
  @property({ type: String }) org = '';
  @property({ type: String }) repo = '';
  @property({ type: Array }) workflowRuns: WorkflowRun[] = [];

  static styles = css`
    :host {
      display: block;
      margin-bottom: 1.5rem;
    }

    h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }

    h3:hover {
      text-decoration: underline;
    }

    ul {
      display: flex;
      flex-wrap: wrap;
      padding: 0;
      list-style: none;
      gap: 1rem;
    }

    li {
      flex-grow: 1;
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;
    }
  `;

  /**
   * Get jobs for a specific workflow run
   */
  private getJobsForRun(runId: number): Job[] {
    return repositoryController.getJobsForRun(this.org, this.repo, runId);
  }

  render() {
    return html`
      <h3>
        <a href="https://github.com/${this.org}/${this.repo}/actions" target="_blank">${this.repo}</a>
      </h3>
      ${this.workflowRuns && this.workflowRuns.length > 0
        ? html`
            <ul>
              ${this.workflowRuns.map(
                (run) => html`
                  <li>
                    <workflow-run-element
                      .run=${run}
                      .jobs=${this.getJobsForRun(run.id)}
                    ></workflow-run-element>
                  </li>
                `
              )}
            </ul>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'actions-list-element': ActionsListElement;
  }
}
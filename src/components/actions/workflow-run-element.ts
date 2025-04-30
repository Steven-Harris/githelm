import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AppElement } from '../base/app-element';
import type { WorkflowRun, Job } from '../../integrations/github';

/**
 * Workflow Run Component
 * Displays details of a GitHub Actions workflow run
 * @element workflow-run-element
 */
@customElement('workflow-run-element')
export class WorkflowRunElement extends AppElement {
  @property({ type: Object }) run!: WorkflowRun;
  @property({ type: Array }) jobs: Job[] = [];

  static styles = css`
    :host {
      display: block;
    }

    .workflow-container {
      cursor: pointer;
      padding: 0.5rem;
      background-color: #374151;
      border-radius: 0.375rem;
      display: flex;
      flex-direction: column;
      transition: background-color 0.2s;
    }

    .workflow-container:hover {
      background-color: #4B5563;
    }

    .workflow-title {
      margin-bottom: 0.5rem;
    }

    .workflow-title:hover {
      text-decoration: underline;
    }

    .jobs-list {
      display: flex;
      flex-wrap: wrap;
      margin: -0.25rem;
      padding: 0;
      list-style: none;
    }

    .job-item {
      padding: 0.25rem;
    }

    .job-button {
      border: 1px solid;
      border-radius: 0.5rem;
      padding: 0.75rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-width: 6rem;
      text-align: center;
      font-size: 0.875rem;
    }

    /* Job status colors */
    .job-success {
      background-color: #0284c7;
      border-color: #075985;
      color: white;
    }

    .job-failure {
      background-color: #fecaca;
      border-color: #dc2626;
      color: #7f1d1d;
    }

    .job-waiting {
      background-color: #f59e0b;
      border-color: #92400e;
      color: white;
    }

    .job-in-progress {
      background-color: #7dd3fc;
      border-color: #075985;
      color: #0c4a6e;
    }

    .job-unknown {
      background-color: #d1d5db;
      border-color: #9ca3af;
      color: #374151;
    }
  `;

  /**
   * Determine the CSS class for a job based on its status
   */
  private getJobColorClass(job: Job): string {
    if (job.status === 'completed' && job.conclusion === 'success') {
      return 'job-success';
    } else if (job.conclusion === 'failure') {
      return 'job-failure';
    } else if (job.status === 'waiting') {
      return 'job-waiting';
    } else if (job.status === 'in_progress') {
      return 'job-in-progress';
    } else {
      return 'job-unknown';
    }
  }

  render() {
    if (!this.run) {
      return html``;
    }

    return html`
      <div class="workflow-container">
        <a href="${this.run.html_url}" target="_blank" class="workflow-title">
          ${this.run.display_title || this.run.name || 'Workflow Run'}
        </a>
        <ul class="jobs-list">
          ${this.jobs.map(
            (job) => html`
              <li class="job-item">
                ${job.status === 'pending'
                  ? html`
                      <span class="job-button ${this.getJobColorClass(job)}">
                        ${job.name}
                      </span>
                    `
                  : html`
                      <button class="job-button ${this.getJobColorClass(job)}">
                        ${job.name}
                      </button>
                    `}
              </li>
            `
          )}
        </ul>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'workflow-run-element': WorkflowRunElement;
  }
}
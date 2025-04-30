import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AppElement } from '../base/app-element';
import { type PullRequest } from '../../integrations/github';

// Import the ReviewsElement component
import './reviews-element';

/**
 * Pull Request List Component
 * Displays a list of pull requests for a repository
 * @element pull-request-list-element
 */
@customElement('pull-request-list-element')
export class PullRequestListElement extends AppElement {
  @property({ type: String }) org = '';
  @property({ type: String }) repo = '';
  @property({ type: Array }) pullRequests: PullRequest[] = [];

  static styles = css`
    :host {
      display: block;
      margin-bottom: 1rem;
    }

    h3 {
      font-size: 1.125rem;
      font-weight: 600;
    }
    
    h3:hover {
      text-decoration: underline;
    }

    .avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      margin-right: 0.5rem;
    }

    #pr-item {
      cursor: pointer;
      padding: 0.5rem;
      background-color: #374151;
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      transition: background-color 0.2s;
    }

    #pr-item:hover {
      background-color: #4B5563;
    }

    .pr-title {
      flex-grow: 1;
      max-width: 70%;
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pr-title:hover {
      text-decoration: underline;
    }

    li {
      margin-bottom: 0.5rem;
    }

    ul {
      list-style: none;
      padding: 0;
    }
  `;

  render() {
    return html`
      <h3>
        <a href="https://github.com/${this.org}/${this.repo}/pulls" target="_blank">${this.repo}</a>
      </h3>
      <ul>
        ${this.pullRequests && this.pullRequests.length > 0
          ? this.pullRequests.map(
              (pr) => html`
                <li class="mb-2">
                  <a href="${pr.html_url}" target="_blank">
                    <div id="pr-item">
                      <img src="${pr.user.avatar_url}" class="avatar" alt="${pr.user.login}" />
                      <span class="pr-title">${pr.title}</span>
                      <reviews-element .reviews=${pr.reviews || []}></reviews-element>
                    </div>
                  </a>
                </li>
              `
            )
          : ''}
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pull-request-list-element': PullRequestListElement;
  }
}
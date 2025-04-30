import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { AppElement } from '../base/app-element';
import { router } from '../../controllers/ui-state.controller';

@customElement('tabs-element')
export class TabsElement extends AppElement {
  @state() private activeTab = 'pull-requests';
  
  constructor() {
    super();
    // Listen for tab changes from the UI state controller
    this.setupTabListener();
  }
  
  private setupTabListener(): void {
    // This would connect to a UI state controller to get the active tab
    // For simplicity, we'll just set a default here
    this.activeTab = 'pull-requests';
  }
  
  private handleTabClick(tab: string): void {
    this.activeTab = tab;
    // In a real implementation, you'd dispatch an event or update a state controller
  }
  
  render() {
    return html`
      <div id="tabs" class="flex gap-2 justify-center py-4 bg-gray-800 shadow-md">
        <button
          @click=${() => this.handleTabClick('pull-requests')}
          class="px-4 py-2 rounded-md ${this.activeTab === 'pull-requests' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}"
        >
          Pull Requests
        </button>
        <button
          @click=${() => this.handleTabClick('actions')}
          class="px-4 py-2 rounded-md ${this.activeTab === 'actions' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}"
        >
          Actions
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tabs-element': TabsElement;
  }
}
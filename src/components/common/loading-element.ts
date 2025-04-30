import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AppElement } from '../base/app-element';

@customElement('loading-element')
export class LoadingElement extends AppElement {
  @property({ type: Boolean }) loading = false;
  
  render() {
    if (!this.loading) {
      return html``;
    }
    
    return html`
      <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div class="bg-gray-700 p-6 rounded-lg shadow-lg flex flex-col items-center">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p class="text-white">Loading...</p>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'loading-element': LoadingElement;
  }
}
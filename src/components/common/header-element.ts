import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AppElement } from '../base/app-element';
import { firebase } from '../../integrations/firebase';
import { router } from '../../controllers/ui-state.controller';
import { eventBusController } from '../../controllers/event-bus.controller';

@customElement('header-element')
export class HeaderElement extends AppElement {
  @property({ type: Boolean }) signedIn = false;
  
  // Get the current path to determine if we're on the config page
  private get isConfigPage(): boolean {
    return window.location.pathname === '/config';
  }
  
  // Handle save button click
  private handleSave(): void {
    eventBusController.dispatchEvent(new CustomEvent('save-config'));
  }
  
  // Handle cancel button click
  private handleCancel(): void {
    eventBusController.dispatchEvent(new CustomEvent('cancel-config'));
    router.navigate('/');
  }
  
  // Handle config navigation
  private navigateToConfig(): void {
    router.navigate('/config');
  }
  
  // Handle login
  private handleLogin(): void {
    firebase.signIn();
  }
  
  // Handle logout
  private handleLogout(): void {
    firebase.signOut();
  }
  
  render() {
    return html`
      <header class="flex justify-between items-center pl-5 pr-5 pb-4 pt-4 sticky top-0 z-10">
        <div id="header" class="flex">
          <img src="/assets/helm.svg" alt="site logo" width="50" height="50" class="mr-2" />
          <h1 class="text-4xl font-bold">GitHelm</h1>
        </div>
        <div id="buttons" class="flex space-x-4">
          ${this.signedIn
            ? html`
              ${this.isConfigPage
                ? html`
                  <button @click=${this.handleCancel} id="cancel-config-button" type="button" class="nav-button">
                    Cancel
                  </button>
                  <button @click=${this.handleSave} id="save-config-button" type="button" class="nav-button primary">
                    Save
                  </button>
                `
                : html`
                  <button @click=${this.navigateToConfig} id="config-button" type="button" class="nav-button">
                    Config
                  </button>
                  <button @click=${this.handleLogout} id="logout-button" type="button" class="nav-button">
                    Logout
                  </button>
                `
              }
            `
            : html`
              <button @click=${this.handleLogin} type="button" class="nav-button">
                Login with GitHub
              </button>
            `
          }
        </div>
      </header>
    `;
  }
  
  static styles = [
    // Inherit base styles
    ...AppElement.styles,
    // Add component-specific styles
    // Note: In a real implementation, you'd import or define CSS here using 'css' from lit
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'header-element': HeaderElement;
  }
}
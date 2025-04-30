import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { AppElement } from './base/app-element';
import { firebase, authState } from '../integrations/firebase';

import './common/header-element';
import './common/tabs-element';
import './common/loading-element';
import './common/reload-prompt-element';

@customElement('app-shell')
export class AppShell extends AppElement {
  @state() private isSignedIn = false;
  @state() private authStatus: 'initializing' | 'authenticating' | 'authenticated' | 'error' | 'unauthenticated' = 'initializing';
  @state() private isLoading = false;
  
  constructor() {
    super();
    this.setupAuthListeners();
  }
  
  private setupAuthListeners(): void {
    // Listen for auth state changes
    const authStateUnsubscribe = authState.subscribe(state => {
      this.authStatus = state;
      
      if (state === 'authenticated') {
        // Initialize other services that depend on authentication
        this.initAuthDependentServices();
      }
    });
    
    // Listen for user changes
    firebase.addEventListener(firebase.constructor.USER_CHANGED, ((event: CustomEvent) => {
      const userData = event.detail;
      this.isSignedIn = !!userData;
    }) as EventListener);
    
    // Add to disconnected callback to clean up later
    this.addDisconnectCallback(() => {
      authStateUnsubscribe();
    });
  }
  
  private initAuthDependentServices(): void {
    // Initialize any services that depend on authentication
    // For example, loading repository configs
    // This would be the equivalent of the initAuthStateHandling and loadRepositoryConfigs calls
  }
  
  render() {
    return html`
      <div class="flex flex-col h-screen bg-gray-900 text-white">
        <header-element .signedIn=${this.isSignedIn}></header-element>
        
        <main class="flex-1 overflow-auto px-5 bg-gray-900 pb-12">
          <tabs-element></tabs-element>
          
          ${this.renderAuthStatus()}
          
          <div id="content">
            ${this.isSignedIn ? this.renderAuthorizedContent() : this.renderUnauthorizedContent()}
          </div>
        </main>
        
        <footer class="text-center py-4 bg-gray-800 text-gray-400">
          <p>© ${new Date().getFullYear()} GitHelm - GitHub Repository Monitor</p>
        </footer>
        
        <!-- Add the reload prompt component for PWA updates -->
        <reload-prompt-element></reload-prompt-element>
      </div>
    `;
  }
  
  private renderAuthStatus() {
    if (this.authStatus === 'authenticating') {
      return html`
        <div class="col-span-full bg-yellow-800 text-white p-2 rounded text-center">
          Authenticating with GitHub...
        </div>
      `;
    } else if (this.authStatus === 'error') {
      return html`
        <div class="col-span-full bg-red-800 text-white p-2 rounded text-center">
          Authentication error. Please try again.
        </div>
      `;
    }
    
    return html``;
  }
  
  private renderAuthorizedContent() {
    return html`
      ${this.isLoading 
        ? html`<loading-element .loading=${this.isLoading}></loading-element>`
        : html`
          <slot></slot>
        `
      }
    `;
  }
  
  private renderUnauthorizedContent() {
    return html`
      <div class="p-5 text-center">
        <h2 class="text-xl mb-4">Welcome to GitHelm</h2>
        <p>Please log in with GitHub to monitor your repositories.</p>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-shell': AppShell;
  }
}
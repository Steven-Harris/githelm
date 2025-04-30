import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { registerSW } from 'virtual:pwa-register';

@customElement('reload-prompt-element')
export class ReloadPromptElement extends LitElement {
  // State variables for PWA status
  @state() private offlineReady = false;
  @state() private needRefresh = false;
  
  // Store the update function from registerSW
  private updateServiceWorker?: (reloadPage?: boolean) => Promise<void>;
  
  constructor() {
    super();
    this.initServiceWorker();
  }
  
  /**
   * Initialize the service worker registration and set up update handling
   */
  private initServiceWorker(): void {
    // Register the service worker and get the update function
    this.updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh: () => {
        this.needRefresh = true;
      },
      onOfflineReady: () => {
        this.offlineReady = true;
      },
      onRegistered: (swRegistration) => {
        // Check for updates periodically
        if (swRegistration) {
          setInterval(() => {
            swRegistration.update();
          }, 60 * 60 * 1000); // Check every hour
        }
      },
      onRegisterError: (error) => {
        console.error('Service worker registration error:', error);
      }
    });
  }
  
  /**
   * Handle the close button click
   */
  private close(): void {
    this.offlineReady = false;
    this.needRefresh = false;
  }
  
  /**
   * Handle the update button click
   */
  private async update(): Promise<void> {
    if (this.updateServiceWorker) {
      await this.updateServiceWorker(true);
    }
  }
  
  render() {
    const showPrompt = this.offlineReady || this.needRefresh;
    
    if (!showPrompt) {
      return html``;
    }
    
    return html`
      <div id="pwa-toast" class="show ${this.needRefresh ? 'refresh' : ''}">
        <div class="message">
          ${this.offlineReady 
            ? html`App ready to work offline` 
            : html`New content available, click the reload button to update.`}
        </div>
        <div class="buttons">
          <button id="pwa-refresh" @click=${this.update}>
            Reload
          </button>
          <button id="pwa-close" @click=${this.close}>
            Close
          </button>
        </div>
      </div>
    `;
  }

  static styles = css`
    #pwa-toast {
      position: fixed;
      right: 0;
      bottom: 0;
      margin: 16px;
      padding: 12px;
      border: 1px solid #8885;
      border-radius: 4px;
      z-index: 100;
      text-align: left;
      box-shadow: 3px 4px 5px 0 #8885;
      background-color: white;
      color: #111827;
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.3s, visibility 0.3s;
    }
    
    #pwa-toast.show {
      visibility: visible;
      opacity: 1;
    }
    
    .message {
      margin-bottom: 8px;
    }
    
    .buttons {
      display: flex;
    }
    
    button {
      border: 1px solid #8885;
      outline: none;
      margin-right: 5px;
      border-radius: 2px;
      padding: 3px 10px;
    }
    
    button#pwa-refresh {
      display: none;
    }
    
    #pwa-toast.refresh button#pwa-refresh {
      display: block;
    }
  `;
}

// Define the element in the global HTMLElementTagNameMap
declare global {
  interface HTMLElementTagNameMap {
    'reload-prompt-element': ReloadPromptElement;
  }
}
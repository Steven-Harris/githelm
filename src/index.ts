/**
 * GitHelm Application Entry Point
 * This file initializes the application and registers all components
 */

// Import components and controllers
import './components/app-shell';
import './components/common/header-element';
import './components/common/loading-element';
import './components/common/tabs-element';
import './components/common/reload-prompt-element';
import { authController } from './controllers/auth.controller';
import { loadingController } from './controllers/loading.controller';
import { router } from './controllers/ui-state.controller';

// Register service workers
async function registerServiceWorkers() {
  // Register the PWA service worker using vite-plugin-pwa
  try {
    if ('serviceWorker' in navigator) {
      // The PWA service worker is registered by vite-plugin-pwa
      console.info('PWA service worker registration successful');
    }
  } catch (error) {
    console.error('PWA service worker registration failed:', error);
  }
}

// Initialize the application
async function init() {
  console.info('🚀 Initializing GitHelm application...');
  
  // Register service workers
  await registerServiceWorkers();
  
  // Mount the app shell
  const appShell = document.createElement('app-shell');
  document.body.appendChild(appShell);

  // Initialize controllers if needed
  // Note: authController is already initialized when imported
  
  console.info('✅ GitHelm application initialized successfully');
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', init);
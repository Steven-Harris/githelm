import { Store } from './base/store';

export type TabType = 'pull-requests' | 'actions';

/**
 * UI State Controller
 * Manages UI state like active tab, routing, and page transitions
 */
class UIStateController extends Store {
  static readonly TAB_CHANGED = 'tab-changed';
  static readonly ROUTE_CHANGED = 'route-changed';
  
  private _activeTab: TabType = 'pull-requests';
  private _currentPath: string = '/';
  
  constructor() {
    super();
    this.initRouteListener();
  }
  
  /**
   * Set up listener for route/hash changes
   */
  private initRouteListener(): void {
    // Listen for route changes
    window.addEventListener('popstate', () => this.handleRouteChange());
    
    // Set initial route
    this.handleRouteChange();
  }
  
  /**
   * Handle route changes
   */
  private handleRouteChange(): void {
    const path = window.location.pathname;
    this._currentPath = path;
    
    // Update active tab based on path
    if (path.includes('actions')) {
      this.setActiveTab('actions', false);
    } else {
      this.setActiveTab('pull-requests', false);
    }
    
    this.dispatchEvent(new CustomEvent(UIStateController.ROUTE_CHANGED, { 
      detail: { path: this._currentPath } 
    }));
  }
  
  /**
   * Set the active tab
   */
  setActiveTab(tab: TabType, updateRoute = true): void {
    if (this._activeTab === tab) return;
    
    this._activeTab = tab;
    
    // Update route if needed
    if (updateRoute) {
      this.navigate(tab === 'actions' ? '/actions' : '/');
    }
    
    this.dispatchEvent(new CustomEvent(UIStateController.TAB_CHANGED, { 
      detail: { tab: this._activeTab } 
    }));
  }
  
  /**
   * Navigate to a different route
   */
  navigate(path: string): void {
    if (this._currentPath === path) return;
    
    history.pushState(null, '', path);
    this._currentPath = path;
    
    this.dispatchEvent(new CustomEvent(UIStateController.ROUTE_CHANGED, { 
      detail: { path } 
    }));
  }
  
  /**
   * Get the active tab
   */
  get activeTab(): TabType {
    return this._activeTab;
  }
  
  /**
   * Get the current path
   */
  get currentPath(): string {
    return this._currentPath;
  }
}

// Export a singleton instance
export const router = new UIStateController();
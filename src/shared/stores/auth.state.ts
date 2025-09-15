import { writable, derived } from 'svelte/store';
import { firebase, authState as firebaseAuthState } from '$integrations/firebase';

export enum AuthState {
  INITIALIZING = 'initializing',
  AUTHENTICATING = 'authenticating',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  ERROR = 'error',
}

export interface AuthStateContext {
  user: any | null;
  error: string | null;
  isLoading: boolean;
  lastActivity: number;
}

class AuthStateMachine {
  private state = writable<AuthState>(AuthState.INITIALIZING);
  private context = writable<AuthStateContext>({
    user: null,
    error: null,
    isLoading: false,
    lastActivity: Date.now(),
  });

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Subscribe to Firebase auth state changes
    firebaseAuthState.subscribe((firebaseAuthState) => {
      this.handleFirebaseAuthChange(firebaseAuthState);
    });

    // Subscribe to user changes
    firebase.user.subscribe((user) => {
      this.updateContext({ user });
    });
  }

  private handleFirebaseAuthChange(firebaseAuthState: string): void {
    switch (firebaseAuthState) {
      case 'initializing':
        this.transitionTo(AuthState.INITIALIZING);
        break;
      case 'authenticating':
        this.transitionTo(AuthState.AUTHENTICATING);
        break;
      case 'authenticated':
        this.transitionTo(AuthState.AUTHENTICATED);
        break;
      case 'unauthenticated':
        this.transitionTo(AuthState.UNAUTHENTICATED);
        break;
      default:
        this.transitionTo(AuthState.ERROR, { error: 'Unknown auth state' });
    }
  }

  private transitionTo(newState: AuthState, contextUpdate: Partial<AuthStateContext> = {}): void {
    const currentState = this.getCurrentState();
    
    if (!this.canTransition(currentState, newState)) {
      return;
    }

    this.state.set(newState);
    this.updateContext({
      isLoading: newState === AuthState.INITIALIZING || newState === AuthState.AUTHENTICATING,
      lastActivity: Date.now(),
      ...contextUpdate,
    });

  }

  private canTransition(from: AuthState, to: AuthState): boolean {
    const validTransitions: Record<AuthState, AuthState[]> = {
      [AuthState.INITIALIZING]: [AuthState.AUTHENTICATING, AuthState.UNAUTHENTICATED, AuthState.ERROR],
      [AuthState.AUTHENTICATING]: [AuthState.AUTHENTICATED, AuthState.UNAUTHENTICATED, AuthState.ERROR],
      [AuthState.AUTHENTICATED]: [AuthState.UNAUTHENTICATED, AuthState.ERROR],
      [AuthState.UNAUTHENTICATED]: [AuthState.AUTHENTICATING, AuthState.ERROR],
      [AuthState.ERROR]: [AuthState.INITIALIZING, AuthState.AUTHENTICATING, AuthState.UNAUTHENTICATED],
    };

    return validTransitions[from]?.includes(to) || false;
  }

  private getCurrentState(): AuthState {
    let currentState: AuthState;
    this.state.subscribe(state => currentState = state)();
    return currentState!;
  }

  private updateContext(update: Partial<AuthStateContext>): void {
    this.context.update(context => ({ ...context, ...update }));
  }

  // Public API
  getState() {
    return this.state;
  }

  getContext() {
    return this.context;
  }

  isAuthenticated(): boolean {
    return this.getCurrentState() === AuthState.AUTHENTICATED;
  }

  isLoading(): boolean {
    const currentState = this.getCurrentState();
    return currentState === AuthState.INITIALIZING || currentState === AuthState.AUTHENTICATING;
  }

  hasError(): boolean {
    return this.getCurrentState() === AuthState.ERROR;
  }

  getError(): string | null {
    let context: AuthStateContext;
    this.context.subscribe(ctx => context = ctx)();
    return context!.error;
  }

  clearError(): void {
    this.updateContext({ error: null });
    if (this.getCurrentState() === AuthState.ERROR) {
      this.transitionTo(AuthState.UNAUTHENTICATED);
    }
  }
}

// Create singleton instance
const authStateMachine = new AuthStateMachine();

// Export stores
export const authState = authStateMachine.getState();
export const authContext = authStateMachine.getContext();

// Export derived stores
export const isAuthenticated = derived(authState, ($state) => $state === AuthState.AUTHENTICATED);
export const isLoading = derived(authState, ($state) => 
  $state === AuthState.INITIALIZING || $state === AuthState.AUTHENTICATING
);
export const hasError = derived(authState, ($state) => $state === AuthState.ERROR);
export const currentUser = derived(authContext, ($context) => $context.user);

// Export methods
export const {
  isAuthenticated: isUserAuthenticated,
  isLoading: isAuthLoading,
  hasError: hasAuthError,
  getError: getAuthError,
  clearError: clearAuthError,
} = authStateMachine;

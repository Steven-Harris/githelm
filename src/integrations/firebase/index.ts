import { authController } from '../../controllers/auth.controller';
import type { AuthState } from './types';
import type { Configs, Organization, RepoConfig } from './types';
import { getFirestore } from 'firebase/firestore';

// Export the auth controller instead of the firebase client
export { authController as firebase };

// Export auth state as a reactive property for easier usage in components
export const authState = {
  subscribe: (callback: (state: AuthState) => void) => {
    const handleAuthStateChanged = (event: CustomEvent<AuthState>) => {
      callback(event.detail);
    };
    
    authController.addEventListener(authController.constructor.AUTH_STATE_CHANGED, 
      handleAuthStateChanged as EventListener);
      
    // Return unsubscribe function
    return () => {
      authController.removeEventListener(authController.constructor.AUTH_STATE_CHANGED, 
        handleAuthStateChanged as EventListener);
    };
  }
};

// Export user as a reactive property
export const user = {
  subscribe: (callback: (user: any) => void) => {
    const handleUserChanged = (event: CustomEvent<any>) => {
      callback(event.detail);
    };
    
    authController.addEventListener(authController.constructor.USER_CHANGED, 
      handleUserChanged as EventListener);
      
    // Return unsubscribe function
    return () => {
      authController.removeEventListener(authController.constructor.USER_CHANGED, 
        handleUserChanged as EventListener);
    };
  }
};

// Re-export types for convenience
export type { Configs, Organization, RepoConfig, AuthState };
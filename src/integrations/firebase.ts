/**
 * Firebase Integration (Legacy Adapter)
 * 
 * This file exists for backward compatibility.
 * All new code should import directly from the "@integrations/firebase" module.
 */

// Re-export everything from the new modular Firebase implementation
export * from './firebase/index';
export { firebase } from './firebase/client';
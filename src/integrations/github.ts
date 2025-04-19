/**
 * GitHub Integration (Legacy Adapter)
 * 
 * This file exists for backward compatibility.
 * All new code should import directly from the new modular GitHub implementation.
 */

// Re-export all types and functions from the new modular GitHub implementation
export * from './github/index';

// Re-export the default GitHub client
export { github } from './github/index';

// Re-export auth handling function for backward compatibility
export { initAuthStateHandling } from './github/auth';
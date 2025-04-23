/**
 * Firebase Integration Type Definitions
 */

/**
 * Repository configuration for GitHub repositories
 */
export interface RepoConfig {
  org: string;
  repo: string;
  filters: string[];
}

/**
 * GitHub organization definition
 */
export interface Organization {
  name: string;
  avatarUrl?: string;
}

/**
 * User configurations stored in Firestore
 */
export interface Configs {
  pullRequests: RepoConfig[];
  actions: RepoConfig[];
  organizations: Organization[];
}

/**
 * Authentication state types
 */
export type AuthState = 'initializing' | 'authenticating' | 'authenticated' | 'error' | 'unauthenticated';
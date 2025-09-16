import { type RepoConfig } from '$integrations/firebase';
import { clearActionsStores } from '$features/actions/stores/actions.store';
import { clearConfigStores } from '$features/config/stores/config.store';
import { clearPullRequestStores } from '$features/pull-requests/stores/pull-requests.store';

/**
 * Utility function to generate a consistent repository key
 */
export function getRepoKey(config: RepoConfig): string {
  return `${config.org}/${config.repo}`;
}

/**
 * Utility function to clear all stores at once
 */
export function clearAllStores(): void {
  clearPullRequestStores();
  clearActionsStores();
  clearConfigStores();
}
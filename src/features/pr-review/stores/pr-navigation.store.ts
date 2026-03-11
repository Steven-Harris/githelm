import { derived, type Readable } from 'svelte/store';
import { allPullRequests, pullRequestConfigs, getRepoKey } from '$shared/stores/repository-service';
import type { PullRequest } from '$integrations/github';

export interface PRNavigationEntry {
  owner: string;
  repo: string;
  number: number;
  title: string;
}

/**
 * Derives a flat, ordered list of all PRs from the dashboard,
 * maintaining the same order as displayed (configs order → PRs order within each repo).
 */
export const prNavigationList: Readable<PRNavigationEntry[]> = derived(
  [pullRequestConfigs, allPullRequests],
  ([$configs, $allPRs]) => {
    const entries: PRNavigationEntry[] = [];
    const configs = Array.isArray($configs) ? $configs : [];

    for (const config of configs) {
      const repoKey = getRepoKey(config);
      const prs: PullRequest[] = $allPRs[repoKey] || [];
      for (const pr of prs) {
        entries.push({
          owner: config.org,
          repo: config.repo,
          number: pr.number,
          title: pr.title,
        });
      }
    }

    return entries;
  }
);

/**
 * Given the current PR identifiers, returns the previous and next PR navigation entries.
 * Wraps around at the boundaries.
 */
export function getAdjacentPRs(
  list: PRNavigationEntry[],
  owner: string,
  repo: string,
  prNumber: number
): { prev: PRNavigationEntry | null; next: PRNavigationEntry | null } {
  if (list.length === 0) {
    return { prev: null, next: null };
  }

  const currentIndex = list.findIndex(
    (entry) => entry.owner === owner && entry.repo === repo && entry.number === prNumber
  );

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  // If there's only one PR, no navigation needed
  if (list.length === 1) {
    return { prev: null, next: null };
  }

  const prevIndex = (currentIndex - 1 + list.length) % list.length;
  const nextIndex = (currentIndex + 1) % list.length;

  return {
    prev: list[prevIndex],
    next: list[nextIndex],
  };
}

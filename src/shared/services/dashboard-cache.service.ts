import type { RepoConfig } from '$integrations/firebase';
import type { Job, PullRequest, WorkflowRun } from '$integrations/github';

const STORAGE_KEY = 'githelm:dashboard-snapshot';
export const DASHBOARD_SNAPSHOT_KEY = STORAGE_KEY;
const SNAPSHOT_VERSION = 1;

// Anything older than this is considered too stale to be worth showing while
// fresh data loads.
const MAX_AGE = 24 * 60 * 60 * 1000;
const WRITE_DEBOUNCE = 400;

export interface DashboardSnapshot {
  version: number;
  uid: string | null;
  updatedAt: number;
  pullRequestConfigs: RepoConfig[];
  actionsConfigs: RepoConfig[];
  pullRequests: Record<string, PullRequest[]>;
  workflowRuns: Record<string, WorkflowRun[]>;
  workflowJobs: Record<string, Job[]>;
}

export type DashboardSnapshotData = Omit<DashboardSnapshot, 'version' | 'uid' | 'updatedAt'>;

function hasStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

/**
 * Persists the last known dashboard data so a page refresh (or coming back to
 * the app later) can render immediately from cache while fresh data is fetched
 * in the background.
 */
class DashboardCacheService {
  private uid: string | null = null;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private pending: DashboardSnapshotData | null = null;

  load(): DashboardSnapshot | null {
    if (!hasStorage()) return null;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const snapshot = JSON.parse(raw) as DashboardSnapshot;
      if (!snapshot || snapshot.version !== SNAPSHOT_VERSION) {
        this.clear();
        return null;
      }

      if (!snapshot.updatedAt || Date.now() - snapshot.updatedAt > MAX_AGE) {
        this.clear();
        return null;
      }

      this.uid = snapshot.uid ?? null;

      return {
        ...snapshot,
        pullRequestConfigs: snapshot.pullRequestConfigs ?? [],
        actionsConfigs: snapshot.actionsConfigs ?? [],
        pullRequests: snapshot.pullRequests ?? {},
        workflowRuns: snapshot.workflowRuns ?? {},
        workflowJobs: snapshot.workflowJobs ?? {},
      };
    } catch {
      this.clear();
      return null;
    }
  }

  /**
   * Associates the cache with a user. When a different user signs in the cached
   * snapshot belongs to someone else, so it is dropped.
   */
  setUser(uid: string | null): boolean {
    if (!uid) {
      this.uid = null;
      return false;
    }

    const changed = this.uid !== null && this.uid !== uid;
    this.uid = uid;

    if (changed) {
      this.clear();
      this.uid = uid;
    }

    return changed;
  }

  getUser(): string | null {
    return this.uid;
  }

  save(data: DashboardSnapshotData): void {
    if (!hasStorage()) return;

    const isEmpty =
      !data.pullRequestConfigs.length &&
      !data.actionsConfigs.length &&
      !Object.keys(data.pullRequests).length &&
      !Object.keys(data.workflowRuns).length;

    if (isEmpty) {
      this.clear();
      return;
    }

    this.pending = data;

    if (this.writeTimer) return;
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      const pending = this.pending;
      this.pending = null;
      if (pending) this.flush(pending);
    }, WRITE_DEBOUNCE);
  }

  clear(): void {
    this.pending = null;
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }

    if (!hasStorage()) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage may be unavailable (private mode); nothing else to do.
    }
  }

  private flush(data: DashboardSnapshotData): void {
    const snapshot: DashboardSnapshot = {
      version: SNAPSHOT_VERSION,
      uid: this.uid,
      updatedAt: Date.now(),
      ...data,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Most likely a quota error. Drop the workflow jobs (the largest and
      // least important payload) and try once more before giving up.
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...snapshot, workflowJobs: {} }));
      } catch {
        this.clear();
      }
    }
  }
}

export const dashboardCacheService = new DashboardCacheService();

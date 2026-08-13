import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardCacheService, DASHBOARD_SNAPSHOT_KEY } from './dashboard-cache.service';

const sampleData = {
  pullRequestConfigs: [{ org: 'acme', repo: 'widgets', filters: [] }],
  actionsConfigs: [],
  pullRequests: { 'acme/widgets': [{ id: 1 } as any] },
  workflowRuns: {},
  workflowJobs: {},
};

describe('dashboardCacheService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    dashboardCacheService.clear();
    dashboardCacheService.setUser(null);
  });

  it('persists and reloads a snapshot', () => {
    dashboardCacheService.save(sampleData);
    vi.runAllTimers();

    const snapshot = dashboardCacheService.load();
    expect(snapshot?.pullRequests['acme/widgets']).toHaveLength(1);
    expect(snapshot?.pullRequestConfigs).toHaveLength(1);
  });

  it('does not persist an empty snapshot', () => {
    dashboardCacheService.save(sampleData);
    vi.runAllTimers();

    dashboardCacheService.save({
      pullRequestConfigs: [],
      actionsConfigs: [],
      pullRequests: {},
      workflowRuns: {},
      workflowJobs: {},
    });
    vi.runAllTimers();

    expect(localStorage.getItem(DASHBOARD_SNAPSHOT_KEY)).toBeNull();
  });

  it('drops snapshots older than the max age', () => {
    dashboardCacheService.save(sampleData);
    vi.runAllTimers();

    const stored = JSON.parse(localStorage.getItem(DASHBOARD_SNAPSHOT_KEY)!);
    stored.updatedAt = Date.now() - 48 * 60 * 60 * 1000;
    localStorage.setItem(DASHBOARD_SNAPSHOT_KEY, JSON.stringify(stored));

    expect(dashboardCacheService.load()).toBeNull();
    expect(localStorage.getItem(DASHBOARD_SNAPSHOT_KEY)).toBeNull();
  });

  it('clears the snapshot when a different user signs in', () => {
    dashboardCacheService.setUser('user-a');
    dashboardCacheService.save(sampleData);
    vi.runAllTimers();

    expect(dashboardCacheService.setUser('user-a')).toBe(false);
    expect(localStorage.getItem(DASHBOARD_SNAPSHOT_KEY)).not.toBeNull();

    expect(dashboardCacheService.setUser('user-b')).toBe(true);
    expect(localStorage.getItem(DASHBOARD_SNAPSHOT_KEY)).toBeNull();
  });
});

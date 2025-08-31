import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterService } from './filter.service';
import type { WorkflowRun } from '$integrations/github';
import type { WorkflowStatus } from '$shared/stores/workflow-status-filter.store';

describe('FilterService', () => {
  let filterService: FilterService;

  beforeEach(() => {
    filterService = FilterService.getInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = FilterService.getInstance();
      const instance2 = FilterService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('filterWorkflowRunsByStatus', () => {
    const mockWorkflowRuns: Partial<WorkflowRun>[] = [
      {
        id: 1,
        status: 'completed',
        conclusion: 'success',
        name: 'Test Workflow',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T01:00:00Z',
      },
      {
        id: 2,
        status: 'completed',
        conclusion: 'failure',
        name: 'Test Workflow',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T01:00:00Z',
      },
      {
        id: 3,
        status: 'in_progress',
        conclusion: null,
        name: 'Test Workflow',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T01:00:00Z',
      },
    ];

    it('should return empty array for empty runs', () => {
      const statusFilters: Record<WorkflowStatus, boolean> = {
        success: true,
        failure: true,
        in_progress: true,
        queued: true,
        pending: true,
      };

      const result = filterService.filterWorkflowRunsByStatus([], statusFilters);
      expect(result).toEqual([]);
    });

    it('should filter by success status', () => {
      const statusFilters: Record<WorkflowStatus, boolean> = {
        success: true,
        failure: false,
        in_progress: false,
        queued: false,
        pending: false,
      };

      const result = filterService.filterWorkflowRunsByStatus(mockWorkflowRuns as WorkflowRun[], statusFilters);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should filter by failure status', () => {
      const statusFilters: Record<WorkflowStatus, boolean> = {
        success: false,
        failure: true,
        in_progress: false,
        queued: false,
        pending: false,
      };

      const result = filterService.filterWorkflowRunsByStatus(mockWorkflowRuns as WorkflowRun[], statusFilters);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it('should filter by in_progress status', () => {
      const statusFilters: Record<WorkflowStatus, boolean> = {
        success: false,
        failure: false,
        in_progress: true,
        queued: false,
        pending: false,
      };

      const result = filterService.filterWorkflowRunsByStatus(mockWorkflowRuns as WorkflowRun[], statusFilters);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(3);
    });

    it('should return all runs when all filters are enabled', () => {
      const statusFilters: Record<WorkflowStatus, boolean> = {
        success: true,
        failure: true,
        in_progress: true,
        queued: true,
        pending: true,
      };

      const result = filterService.filterWorkflowRunsByStatus(mockWorkflowRuns as WorkflowRun[], statusFilters);
      expect(result).toHaveLength(3);
    });
  });

  describe('filterPullRequestsByLabels', () => {
    const mockPullRequests = [
      {
        id: 1,
        title: 'PR 1',
        labels: [{ name: 'bug' }, { name: 'frontend' }],
      },
      {
        id: 2,
        title: 'PR 2',
        labels: [{ name: 'feature' }],
      },
      {
        id: 3,
        title: 'PR 3',
        labels: [],
      },
    ];

    it('should return all PRs when no label filters', () => {
      const result = filterService.filterPullRequestsByLabels(mockPullRequests, []);
      expect(result).toEqual(mockPullRequests);
    });

    it('should filter by single label', () => {
      const result = filterService.filterPullRequestsByLabels(mockPullRequests, ['bug']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should filter by multiple labels (OR logic)', () => {
      const result = filterService.filterPullRequestsByLabels(mockPullRequests, ['bug', 'feature']);
      expect(result).toHaveLength(2);
      expect(result.map(pr => pr.id)).toEqual([1, 2]);
    });

    it('should handle case-insensitive matching', () => {
      const result = filterService.filterPullRequestsByLabels(mockPullRequests, ['BUG']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should return empty array for non-matching labels', () => {
      const result = filterService.filterPullRequestsByLabels(mockPullRequests, ['nonexistent']);
      expect(result).toEqual([]);
    });
  });

  describe('filterRepositoriesByName', () => {
    const mockRepositories = [
      { name: 'test-repo', full_name: 'org/test-repo' },
      { name: 'example-repo', full_name: 'org/example-repo' },
      { name: 'demo-project', full_name: 'org/demo-project' },
    ];

    it('should return all repos when no search term', () => {
      const result = filterService.filterRepositoriesByName(mockRepositories, '');
      expect(result).toEqual(mockRepositories);
    });

    it('should filter by name', () => {
      const result = filterService.filterRepositoriesByName(mockRepositories, 'test');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-repo');
    });

    it('should filter by full name', () => {
      const result = filterService.filterRepositoriesByName(mockRepositories, 'example');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('example-repo');
    });

    it('should handle case-insensitive matching', () => {
      const result = filterService.filterRepositoriesByName(mockRepositories, 'TEST');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-repo');
    });

    it('should return empty array for non-matching search', () => {
      const result = filterService.filterRepositoriesByName(mockRepositories, 'nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('getFilterHint', () => {
    it('should return default hint when no filters enabled', () => {
      const statusFilters: Record<WorkflowStatus, boolean> = {
        success: false,
        failure: false,
        in_progress: false,
        queued: false,
        pending: false,
      };

      const result = filterService.getFilterHint(statusFilters);
      expect(result).toBe('workflow runs');
    });

    it('should return single filter hint', () => {
      const statusFilters: Record<WorkflowStatus, boolean> = {
        success: true,
        failure: false,
        in_progress: false,
        queued: false,
        pending: false,
      };

      const result = filterService.getFilterHint(statusFilters);
      expect(result).toBe('success workflow runs');
    });

    it('should return multiple filter hint', () => {
      const statusFilters: Record<WorkflowStatus, boolean> = {
        success: true,
        failure: true,
        in_progress: false,
        queued: false,
        pending: false,
      };

      const result = filterService.getFilterHint(statusFilters);
      expect(result).toBe('success and failure workflow runs');
    });

    it('should return default hint when all filters enabled', () => {
      const statusFilters: Record<WorkflowStatus, boolean> = {
        success: true,
        failure: true,
        in_progress: true,
        queued: true,
        pending: true,
      };

      const result = filterService.getFilterHint(statusFilters);
      expect(result).toBe('workflow runs');
    });
  });

  describe('hasActiveFilters', () => {
    it('should return false when no filters active', () => {
      const filters = {
        statusFilters: undefined,
        labelFilters: [],
        workflowFilters: [],
      };

      const result = filterService.hasActiveFilters(filters);
      expect(result).toBe(false);
    });

    it('should return true when status filters active', () => {
      const filters = {
        statusFilters: { 
          success: true, 
          failure: false, 
          in_progress: false, 
          queued: false, 
          pending: false 
        },
        labelFilters: [],
        workflowFilters: [],
      };

      const result = filterService.hasActiveFilters(filters);
      expect(result).toBe(true);
    });

    it('should return true when label filters active', () => {
      const filters = {
        statusFilters: undefined,
        labelFilters: ['bug'],
        workflowFilters: [],
      };

      const result = filterService.hasActiveFilters(filters);
      expect(result).toBe(true);
    });

    it('should return true when workflow filters active', () => {
      const filters = {
        statusFilters: undefined,
        labelFilters: [],
        workflowFilters: ['test-workflow'],
      };

      const result = filterService.hasActiveFilters(filters);
      expect(result).toBe(true);
    });
  });

  describe('getFilteredData', () => {
    it('should return original data when no filters', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const filters = {
        statusFilters: undefined,
        labelFilters: [],
        workflowFilters: [],
      };

      const result = filterService.getFilteredData(data, filters);
      expect(result.data).toEqual(data);
      expect(result.totalCount).toBe(2);
      expect(result.filteredCount).toBe(2);
    });

    it('should filter workflow runs by status', () => {
      const data: Partial<WorkflowRun>[] = [
        {
          id: 1,
          status: 'completed',
          conclusion: 'success',
          name: 'Test',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T01:00:00Z',
        },
        {
          id: 2,
          status: 'completed',
          conclusion: 'failure',
          name: 'Test',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T01:00:00Z',
        },
      ];

      const filters = {
        statusFilters: { 
          success: true, 
          failure: false, 
          in_progress: false, 
          queued: false, 
          pending: false 
        },
        labelFilters: [],
        workflowFilters: [],
      };

      const result = filterService.getFilteredData(data as WorkflowRun[], filters);
      expect(result.data).toHaveLength(1);
      expect(result.totalCount).toBe(2);
      expect(result.filteredCount).toBe(1);
    });
  });

  describe('clearFilters', () => {
    it('should return empty filter criteria', () => {
      const result = filterService.clearFilters();
      expect(result).toEqual({
        statusFilters: undefined,
        labelFilters: [],
        workflowFilters: [],
      });
    });
  });
});

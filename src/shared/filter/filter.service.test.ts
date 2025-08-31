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


});

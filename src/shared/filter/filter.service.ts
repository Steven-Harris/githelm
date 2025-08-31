import type { WorkflowRun } from '$integrations/github';
import type { WorkflowStatus } from '$shared/stores/workflow-status-filter.store';

export interface FilterCriteria {
  statusFilters?: Record<WorkflowStatus, boolean>;
  labelFilters?: string[];
  workflowFilters?: string[];
}

export interface FilterResult<T> {
  data: T[];
  totalCount: number;
  filteredCount: number;
}

export class FilterService {
  private static instance: FilterService;

  private constructor() {}

  static getInstance(): FilterService {
    if (!FilterService.instance) {
      FilterService.instance = new FilterService();
    }
    return FilterService.instance;
  }

  filterWorkflowRunsByStatus(
    runs: WorkflowRun[],
    statusFilters: Record<WorkflowStatus, boolean>
  ): WorkflowRun[] {
    if (!runs || runs.length === 0) return [];

    return runs.filter((run) => this.passesStatusFilter(run, statusFilters));
  }

  private passesStatusFilter(
    run: WorkflowRun,
    statusFilters: Record<WorkflowStatus, boolean>
  ): boolean {
    const status = run.conclusion || run.status;
    const normalizedStatus = status.toLowerCase();
    const filterStatus = normalizedStatus === 'completed' ? 'success' : normalizedStatus;

    return Object.keys(statusFilters).includes(filterStatus)
      ? statusFilters[filterStatus as WorkflowStatus]
      : true;
  }

  getFilterHint(statusFilters: Record<WorkflowStatus, boolean>): string {
    const statusLabels: Record<string, string> = {
      in_progress: 'in progress',
      queued: 'queued',
      success: 'success',
      failure: 'failure',
      cancelled: 'cancelled',
    };

    const enabledFilters = Object.entries(statusFilters)
      .filter(([_, enabled]) => enabled)
      .map(([status, _]) => statusLabels[status] || status);

    if (enabledFilters.length === 0) {
      return 'workflow runs';
    } else if (enabledFilters.length === 1) {
      return `${enabledFilters[0]} workflow runs`;
    } else if (enabledFilters.length === Object.keys(statusFilters).length) {
      return 'workflow runs';
    } else {
      return `${enabledFilters.slice(0, -1).join(', ')} and ${enabledFilters.slice(-1)} workflow runs`;
    }
  }

  hasActiveFilters(filters: FilterCriteria): boolean {
    if (filters.statusFilters) {
      const hasStatusFilters = Object.values(filters.statusFilters).some(Boolean);
      if (hasStatusFilters) return true;
    }

    if (filters.labelFilters && filters.labelFilters.length > 0) {
      return true;
    }

    if (filters.workflowFilters && filters.workflowFilters.length > 0) {
      return true;
    }

    return false;
  }

  getFilteredData<T extends object>(
    data: T[],
    filters: FilterCriteria
  ): FilterResult<T> {
    let filteredData = [...data];

    if (filters.statusFilters && data.length > 0 && 'conclusion' in data[0]) {
      filteredData = this.filterWorkflowRunsByStatus(
        filteredData as WorkflowRun[],
        filters.statusFilters
      ) as T[];
    }

    return {
      data: filteredData,
      totalCount: data.length,
      filteredCount: filteredData.length,
    };
  }

  clearFilters(): FilterCriteria {
    return {
      statusFilters: undefined,
      labelFilters: [],
      workflowFilters: [],
    };
  }
}

export const filterService = FilterService.getInstance();

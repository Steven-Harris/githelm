import { fetchActions, fetchWorkflowJobs } from '$integrations/github';
import { captureException } from '$integrations/sentry';
import type { WorkflowRun, Job } from '$integrations/github';

export interface ActionFilters {
  workflows?: string[];
  status?: 'completed' | 'in_progress' | 'queued' | 'waiting';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'neutral' | 'skipped';
}

export interface ActionQuery {
  org: string;
  repo: string;
  filters?: ActionFilters;
}

export class ActionRepository {
  private static instance: ActionRepository;

  private constructor() {}

  static getInstance(): ActionRepository {
    if (!ActionRepository.instance) {
      ActionRepository.instance = new ActionRepository();
    }
    return ActionRepository.instance;
  }

  async fetchWorkflowRuns(query: ActionQuery): Promise<WorkflowRun[]> {
    try {
      const { org, repo, filters } = query;
      const workflows = await fetchActions(org, repo, filters?.workflows || []);
      
      const allRuns = workflows.flatMap(workflow => workflow.workflow_runs || []);
      
      let filteredRuns = allRuns;

      if (filters?.status) {
        filteredRuns = filteredRuns.filter(run => run.status === filters.status);
      }

      if (filters?.conclusion) {
        filteredRuns = filteredRuns.filter(run => run.conclusion === filters.conclusion);
      }

      return filteredRuns;
    } catch (error) {
      captureException(error, {
        action: 'fetchWorkflowRuns',
        context: `${query.org}/${query.repo}`,
      });
      throw error;
    }
  }

  async fetchWorkflowRunsForMultiple(
    queries: ActionQuery[]
  ): Promise<Record<string, WorkflowRun[]>> {
    const results: Record<string, WorkflowRun[]> = {};

    try {
      const promises = queries.map(async (query) => {
        const key = `${query.org}/${query.repo}`;
        try {
          const runs = await this.fetchWorkflowRuns(query);
          results[key] = runs;
        } catch (error) {
          captureException(error, {
            action: 'fetchWorkflowRunsForMultiple',
            context: key,
          });
          results[key] = [];
        }
      });

      await Promise.all(promises);
      return results;
    } catch (error) {
      captureException(error, {
        action: 'fetchWorkflowRunsForMultiple',
        context: 'multiple repositories',
      });
      throw error;
    }
  }

  async fetchJobsForWorkflowRuns(
    org: string,
    repo: string,
    runs: WorkflowRun[]
  ): Promise<Record<number, Job[]>> {
    const results: Record<number, Job[]> = {};

    try {
      const promises = runs.map(async (run) => {
        try {
          const jobs = await fetchWorkflowJobs(org, repo, run.id.toString());
          results[run.id] = jobs;
        } catch (error) {
          captureException(error, {
            action: 'fetchJobsForWorkflowRuns',
            context: `${org}/${repo}/run-${run.id}`,
          });
          results[run.id] = [];
        }
      });

      await Promise.all(promises);
      return results;
    } catch (error) {
      captureException(error, {
        action: 'fetchJobsForWorkflowRuns',
        context: `${org}/${repo}`,
      });
      throw error;
    }
  }

  getWorkflowRunStats(runs: WorkflowRun[]): {
    total: number;
    completed: number;
    inProgress: number;
    queued: number;
    waiting: number;
    success: number;
    failure: number;
    cancelled: number;
    byWorkflow: Record<string, number>;
  } {
    const stats = {
      total: runs.length,
      completed: 0,
      inProgress: 0,
      queued: 0,
      waiting: 0,
      success: 0,
      failure: 0,
      cancelled: 0,
      byWorkflow: {} as Record<string, number>,
    };

    runs.forEach(run => {
      switch (run.status) {
        case 'completed':
          stats.completed++;
          break;
        case 'in_progress':
          stats.inProgress++;
          break;
        case 'queued':
          stats.queued++;
          break;
        case 'waiting':
          stats.waiting++;
          break;
      }

      switch (run.conclusion) {
        case 'success':
          stats.success++;
          break;
        case 'failure':
          stats.failure++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
      }

      const workflowName = run.name || 'Unknown';
      stats.byWorkflow[workflowName] = (stats.byWorkflow[workflowName] || 0) + 1;
    });

    return stats;
  }

  filterWorkflowRuns(
    runs: WorkflowRun[],
    criteria: {
      status?: 'completed' | 'in_progress' | 'queued' | 'waiting';
      conclusion?: 'success' | 'failure' | 'cancelled' | 'neutral' | 'skipped';
      workflow?: string;
      branch?: string;
      actor?: string;
    }
  ): WorkflowRun[] {
    return runs.filter(run => {
      if (criteria.status && run.status !== criteria.status) {
        return false;
      }

      if (criteria.conclusion && run.conclusion !== criteria.conclusion) {
        return false;
      }

      if (criteria.workflow && run.name !== criteria.workflow) {
        return false;
      }

      // if (criteria.branch && run.head_branch !== criteria.branch) {
      //   return false;
      // }

      if (criteria.actor && run.actor?.login !== criteria.actor) {
        return false;
      }

      return true;
    });
  }

  /**
   * Sort workflow runs by various criteria.
   */
  sortWorkflowRuns(
    runs: WorkflowRun[],
    sortBy: 'created' | 'updated' | 'name' | 'actor' = 'created',
    order: 'asc' | 'desc' = 'desc'
  ): WorkflowRun[] {
    return [...runs].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'actor':
          comparison = (a.actor?.login || '').localeCompare(b.actor?.login || '');
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });
  }

  getWorkflowRunDuration(run: WorkflowRun): number | null {
    if (!run.created_at || !run.updated_at) {
      return null;
    }

    const startTime = new Date(run.created_at).getTime();
    const endTime = new Date(run.updated_at).getTime();
    return endTime - startTime;
  }

  formatWorkflowRunDuration(durationMs: number | null): string {
    if (durationMs === null) {
      return 'Unknown';
    }

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

export const actionRepository = ActionRepository.getInstance();

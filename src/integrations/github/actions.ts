import { fetchData } from './api-client';
import { queueApiCallIfNeeded } from './auth';
import { captureException } from '../sentry';
import { memoryCacheService, CacheKeys } from '$shared/services/memory-cache.service';
import type { Workflow, WorkflowRun, WorkflowJobs, Job, Step } from './types';

// Helper function to check if we need to fetch new workflow runs
export async function checkForNewWorkflowRuns(org: string, repo: string, action: string): Promise<boolean> {
  try {
    const cacheKey = memoryCacheService.createKey(CacheKeys.WORKFLOWS, org, repo, action);
    const cached = memoryCacheService.get<Workflow>(cacheKey);
    
    if (!cached) {
      return true; // No cache, need to fetch
    }
    
    if (!cached.workflow_runs || cached.workflow_runs.length === 0) {
      return true; // No runs in cache, need to fetch
    }
    
    // Get the latest run ID from cache
    const latestCachedRunId = cached.workflow_runs[0].id;
    
    // Fetch just the latest run to compare
    const data = await fetchData<Workflow>(`https://api.github.com/repos/${org}/${repo}/actions/workflows/${action}/runs?per_page=1`);
    
    if (!data?.workflow_runs || data.workflow_runs.length === 0) {
      return false; // No runs available, no need to update
    }
    
    const latestRunId = data.workflow_runs[0].id;
    
    // If the latest run ID is different, we have new runs
    return latestRunId !== latestCachedRunId;
  } catch (error) {
    console.warn(`Error checking for new workflow runs for ${org}/${repo}/${action}:`, error);
    return true; // On error, assume we need to fetch
  }
}

export async function fetchActions(org: string, repo: string, actions: string[]): Promise<Workflow[]> {
  return queueApiCallIfNeeded(async () => {
    try {
      // Process workflows sequentially instead of in parallel to reduce rate limiting
      const results: Workflow[] = [];
      for (const action of actions) {
        const workflow = await fetchSingleWorkflowOptimized(org, repo, action);
        results.push(workflow);
        
        // Add small delay between workflow requests
        if (actions.indexOf(action) < actions.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
      return results;
    } catch (error) {
      // Don't report rate limit errors to Sentry - they're expected behavior
      if (!(error instanceof Error && error.message === 'Rate limit exceeded')) {
        captureException(error, {
          context: 'GitHub Actions',
          function: 'fetchActions',
          org,
          repo,
          actionsCount: actions.length,
        });
      }
      throw error;
    }
  });
}

// Smart workflow fetching that avoids unnecessary requests for completed actions
async function fetchSingleWorkflowOptimized(org: string, repo: string, action: string): Promise<Workflow> {
  const cacheKey = memoryCacheService.createKey(CacheKeys.WORKFLOWS, org, repo, action);
  const fiveMinutes = 5 * 60 * 1000;
  const thirtyMinutes = 30 * 60 * 1000;
  
  try {
    // Check if we have cached data with entry metadata
    const cacheEntry = memoryCacheService.getEntry<Workflow>(cacheKey);
    const now = Date.now();
    
    // If we have cached data and it's recent, check if the latest run is completed
    if (cacheEntry && (now - cacheEntry.timestamp) < fiveMinutes) {
      const cached = cacheEntry.data;
      
      // If we have workflow runs and the latest one is completed, we can use cache longer
      if (cached.workflow_runs && cached.workflow_runs.length > 0) {
        const latestRun = cached.workflow_runs[0];
        
        // If latest run is completed and we fetched recently, return cached data
        if (latestRun.status === 'completed' && (now - cacheEntry.timestamp) < thirtyMinutes) {
          return cached;
        }
      }
    }
    
    // Fetch fresh data
    const workflow = await fetchSingleWorkflow(org, repo, action);
    
    // Cache the result with appropriate TTL based on workflow status
    let ttl = fiveMinutes; // Default 5 minutes
    if (workflow.workflow_runs && workflow.workflow_runs.length > 0) {
      const latestRun = workflow.workflow_runs[0];
      // Cache completed workflows longer
      if (latestRun.status === 'completed') {
        ttl = thirtyMinutes;
      }
    }
    
    memoryCacheService.set(cacheKey, workflow, ttl);
    
    return workflow;
  } catch (error) {
    // If there's an error and we have cached data, return it
    const cached = memoryCacheService.get<Workflow>(cacheKey);
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}

async function fetchSingleWorkflow(org: string, repo: string, action: string): Promise<Workflow> {
  try {
    const data = await fetchData<Workflow>(`https://api.github.com/repos/${org}/${repo}/actions/workflows/${action}/runs?per_page=1`);

    // Validate that the response has the expected structure
    if (!data) {
      throw new Error('No data returned from GitHub API');
    }

    if (!data.workflow_runs || !Array.isArray(data.workflow_runs)) {
      console.warn(`Invalid workflow_runs data for ${org}/${repo}/${action}:`, data);
      // Return a default workflow structure if the API response is invalid
      return {
        name: action,
        total_count: 0,
        workflow_runs: [],
      };
    }

    const processedWorkflowRuns = await Promise.all(data.workflow_runs.map((run) => processWorkflowRun(org, repo, run)));

    return {
      name: action,
      total_count: data.total_count || 0,
      workflow_runs: processedWorkflowRuns,
    };
  } catch (error) {
    // Don't report network errors to Sentry, but log them
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      console.warn(`Network error fetching workflow ${org}/${repo}/${action}:`, error.message);
      // Return empty workflow instead of throwing
      return {
        name: action,
        total_count: 0,
        workflow_runs: [],
      };
    }

    // Don't report rate limit errors to Sentry - they're expected behavior
    if (!(error instanceof Error && error.message === 'Rate limit exceeded')) {
      captureException(error, {
        context: 'GitHub Actions',
        function: 'fetchSingleWorkflow',
        org,
        repo,
        action,
      });
    }
    throw error;
  }
}

async function processWorkflowRun(org: string, repo: string, run: WorkflowRun): Promise<WorkflowRun> {
  try {
    const jobs = await fetchWorkflowJobs(org, repo, run.id.toString());

    return {
      ...run,
      workflow_jobs: {
        total_count: jobs.length,
        jobs: jobs.map((job) => ({
          ...job,
          steps: filterSuccessfulSteps(job.steps),
        })),
      },
    };
  } catch (error) {
    // Don't report rate limit errors to Sentry - they're expected behavior
    if (!(error instanceof Error && error.message === 'Rate limit exceeded')) {
      captureException(error, {
        context: 'GitHub Actions',
        function: 'processWorkflowRun',
        org,
        repo,
        runId: run.id,
        workflowName: run.name,
      });
    }

    // Return the run without jobs data in case of error
    return {
      ...run,
      workflow_jobs: {
        total_count: 0,
        jobs: [],
      },
    };
  }
}

export function filterSuccessfulSteps(steps: Step[]): Step[] {
  return steps.filter((step) => {
    if (step.status !== 'completed') {
      return false;
    }

    if (step.conclusion === 'success') {
      return true;
    } else if (step.conclusion === 'skipped') {
      return false;
    }

    return true;
  });
}

export async function fetchWorkflowJobs(org: string, repo: string, runId: string): Promise<Job[]> {
  return queueApiCallIfNeeded(async () => {
    const cacheKey = memoryCacheService.createKey(CacheKeys.WORKFLOW_RUNS, org, repo, runId);

    // Check memory cache first
    const cached = memoryCacheService.get<{ jobs: Job[]; completed: boolean; all_success: boolean }>(cacheKey);
    if (cached && cached.completed) {
      // This is a completed run, we can safely return cached data
      return cached.jobs;
    }

    try {
      const workflows = await fetchData<WorkflowJobs>(`https://api.github.com/repos/${org}/${repo}/actions/runs/${runId}/jobs`);

      // Validate that the response has the expected structure
      if (!workflows) {
        console.warn(`No workflow jobs data returned for ${org}/${repo} run ${runId}`);
        return [];
      }

      if (!workflows.jobs || !Array.isArray(workflows.jobs)) {
        console.warn(`Invalid jobs data for ${org}/${repo} run ${runId}:`, workflows);
        return [];
      }

      let allSuccess = true;

      // Filter jobs based on status and conclusion
      workflows.jobs = workflows.jobs.filter((job) => {
        if (job.status === 'completed') {
          if (job.conclusion === 'success') {
            return true;
          } else if (job.conclusion === 'skipped') {
            return false;
          }
          allSuccess = false;
          return true;
        }
        return false;
      });

      // Cache runs that are completed (regardless of success/failure)
      const allCompleted = workflows.jobs.every(job => job.status === 'completed');
      if (allCompleted) {
        // Store completion metadata along with jobs
        const cacheData = {
          jobs: workflows.jobs,
          completed: true,
          all_success: allSuccess
        };
        
        // Cache completed jobs for 30 minutes since they won't change
        memoryCacheService.set(cacheKey, cacheData, 30 * 60 * 1000);
      }

      return workflows.jobs;
    } catch (error) {
      // Don't report network errors or rate limit errors to Sentry, but log them
      if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message === 'Rate limit exceeded')) {
        console.warn(`Network/rate limit error fetching workflow jobs for ${org}/${repo} run ${runId}:`, error.message);
        return [];
      }

      captureException(error, {
        context: 'GitHub Actions',
        function: 'fetchWorkflowJobs',
        org,
        repo,
        runId,
      });
      return [];
    }
  });
}

export async function fetchMultipleWorkflowJobs(workflowRuns: Array<{ org: string; repo: string; runId: string }>): Promise<Record<string, Job[]>> {
  return queueApiCallIfNeeded(async () => {
    const results: Record<string, Job[]> = {};

    try {
      // Check memory cache first for all runs
      const cachedRuns = workflowRuns.filter((run) => {
        const key = `${run.org}/${run.repo}:${run.runId}`;
        const cacheKey = memoryCacheService.createKey(CacheKeys.WORKFLOW_RUNS, run.org, run.repo, run.runId);
        const cached = memoryCacheService.get<{ jobs: Job[]; completed: boolean; all_success: boolean }>(cacheKey);

        if (cached && cached.completed) {
          // This is a completed run, we can safely use cached data
          results[key] = cached.jobs;
          return false; // Don't need to fetch this run
        }

        return true; // Need to fetch this run
      });

      // If we have runs that need fetching
      if (cachedRuns.length > 0) {
        // Use very conservative batching to avoid rate limits
        const batchSize = 2; // Reduced from 3 to be more conservative
        for (let i = 0; i < cachedRuns.length; i += batchSize) {
          const batch = cachedRuns.slice(i, i + batchSize);

          // Process items in batch sequentially instead of parallel to reduce load
          for (const run of batch) {
            try {
              const key = `${run.org}/${run.repo}:${run.runId}`;
              const jobs = await fetchWorkflowJobs(run.org, run.repo, run.runId);
              results[key] = jobs;
              
              // Add small delay between individual requests
              if (batch.indexOf(run) < batch.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
            } catch (error) {
              // Don't report rate limit errors to Sentry - they're expected behavior
              if (!(error instanceof Error && error.message === 'Rate limit exceeded')) {
                captureException(error, {
                  context: 'GitHub Actions',
                  function: 'fetchMultipleWorkflowJobs - batch processing',
                  org: run.org,
                  repo: run.repo,
                  runId: run.runId,
                });
              }
              results[`${run.org}/${run.repo}:${run.runId}`] = [];
            }
          }

          // Increased delay between batches to be more conservative
          if (i + batchSize < cachedRuns.length) {
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Increased from 1000ms to 2000ms
          }
        }
      }

      return results;
    } catch (error) {
      // Don't report rate limit errors to Sentry - they're expected behavior
      if (!(error instanceof Error && error.message === 'Rate limit exceeded')) {
        captureException(error, {
          context: 'GitHub Actions',
          function: 'fetchMultipleWorkflowJobs',
          runsCount: workflowRuns.length,
        });
      }
      return results; // Return partial results in case of error
    }
  });
}

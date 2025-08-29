import { fetchData } from './api-client';
import { queueApiCallIfNeeded } from './auth';
import { captureException } from '../sentry';
import type { Workflow, WorkflowRun, WorkflowJobs, Job, Step } from './types';

// Helper function to check if we need to fetch new workflow runs
export async function checkForNewWorkflowRuns(org: string, repo: string, action: string): Promise<boolean> {
  try {
    const cacheKey = `workflow-${org}/${repo}/${action}`;
    const cachedWorkflow = localStorage.getItem(cacheKey);
    
    if (!cachedWorkflow) {
      return true; // No cache, need to fetch
    }
    
    const cached = JSON.parse(cachedWorkflow) as Workflow;
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
  const cacheKey = `workflow-${org}/${repo}/${action}`;
  const lastFetchKey = `workflow-last-fetch-${org}/${repo}/${action}`;
  
  try {
    // Check if we have cached data and when we last fetched
    const cachedWorkflow = localStorage.getItem(cacheKey);
    const lastFetch = localStorage.getItem(lastFetchKey);
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    // If we have cached data and it's recent, check if the latest run is completed
    if (cachedWorkflow && lastFetch && parseInt(lastFetch) > fiveMinutesAgo) {
      try {
        const cached = JSON.parse(cachedWorkflow) as Workflow;
        
        // If we have workflow runs and the latest one is completed, we can use cache longer
        if (cached.workflow_runs && cached.workflow_runs.length > 0) {
          const latestRun = cached.workflow_runs[0];
          
          // If latest run is completed and we fetched recently, return cached data
          if (latestRun.status === 'completed' && parseInt(lastFetch) > (now - (30 * 60 * 1000))) {
            return cached;
          }
        }
      } catch (e) {
        // If cache parsing fails, continue to fetch fresh data
        console.warn('Failed to parse cached workflow data:', e);
      }
    }
    
    // Fetch fresh data
    const workflow = await fetchSingleWorkflow(org, repo, action);
    
    // Cache the result and update last fetch time
    try {
      localStorage.setItem(cacheKey, JSON.stringify(workflow));
      localStorage.setItem(lastFetchKey, now.toString());
    } catch (cacheError) {
      console.warn('Failed to cache workflow data:', cacheError);
    }
    
    return workflow;
  } catch (error) {
    // If there's an error and we have cached data, return it
    const cachedWorkflow = localStorage.getItem(cacheKey);
    if (cachedWorkflow) {
      try {
        return JSON.parse(cachedWorkflow) as Workflow;
      } catch (e) {
        console.warn('Failed to parse cached workflow data as fallback:', e);
      }
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
    const key = `${org}/${repo}:${runId}`;

    // Check localStorage cache first
    const run = localStorage.getItem(key);
    if (run !== null && run !== undefined) {
      try {
        const parsed = JSON.parse(run);
        
        // Handle both old format (Job[]) and new format (with metadata)
        if (Array.isArray(parsed)) {
          // Old format - return as is
          return parsed as Job[];
        } else if (parsed.jobs && Array.isArray(parsed.jobs)) {
          // New format with metadata
          if (parsed.completed) {
            // This is a completed run, we can safely return cached data
            return parsed.jobs as Job[];
          }
        }
        
        // If we can't determine the format or it's not completed, fall through to fetch
      } catch (e) {
        captureException(e, {
          context: 'GitHub Actions',
          function: 'fetchWorkflowJobs - cache parsing',
          org,
          repo,
          runId,
        });
      }
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
        try {
          // Store completion metadata along with jobs
          const cacheData = {
            jobs: workflows.jobs,
            completed: true,
            cached_at: Date.now(),
            all_success: allSuccess
          };
          localStorage.setItem(key, JSON.stringify(cacheData));
        } catch (cacheError) {
          captureException(cacheError, {
            context: 'GitHub Actions',
            function: 'fetchWorkflowJobs - cache storage',
            org,
            repo,
            runId,
          });
          // Continue execution even if caching fails
        }
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
      // Check localStorage cache first for all runs
      const cachedRuns = workflowRuns.filter((run) => {
        const key = `${run.org}/${run.repo}:${run.runId}`;
        const cachedData = localStorage.getItem(key);

        if (cachedData !== null && cachedData !== undefined) {
          try {
            const parsed = JSON.parse(cachedData);
            
            // Handle both old format (Job[]) and new format (with metadata)
            if (Array.isArray(parsed)) {
              // Old format - return as is
              results[key] = parsed as Job[];
              return false; // Don't need to fetch this run
            } else if (parsed.jobs && Array.isArray(parsed.jobs)) {
              // New format with metadata
              if (parsed.completed) {
                // This is a completed run, we can safely use cached data
                results[key] = parsed.jobs as Job[];
                return false; // Don't need to fetch this run
              }
            }
            
            // If we can't determine completion status, we need to fetch
            return true;
          } catch (e) {
            captureException(e, {
              context: 'GitHub Actions',
              function: 'fetchMultipleWorkflowJobs - cache parsing',
              runKey: key,
            });
            return true; // Need to fetch if JSON parsing fails
          }
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

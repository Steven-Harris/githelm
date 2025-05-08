import { fetchData } from './api-client';
import { queueApiCallIfNeeded } from './auth';
import { captureException } from '../sentry';
import type { Workflow, WorkflowRun, WorkflowJobs, Job, Step } from './types';

export async function fetchActions(org: string, repo: string, actions: string[]): Promise<Workflow[]> {
  return queueApiCallIfNeeded(async () => {
    try {
      return Promise.all(actions.map((action) => fetchSingleWorkflow(org, repo, action)));
    } catch (error) {
      captureException(error, {
        context: 'GitHub Actions',
        function: 'fetchActions',
        org,
        repo,
        actionsCount: actions.length,
      });
      throw error;
    }
  });
}

async function fetchSingleWorkflow(org: string, repo: string, action: string): Promise<Workflow> {
  try {
    const data = await fetchData<Workflow>(`https://api.github.com/repos/${org}/${repo}/actions/workflows/${action}/runs?per_page=1`);

    const processedWorkflowRuns = await Promise.all(data.workflow_runs.map((run) => processWorkflowRun(org, repo, run)));

    return {
      name: action,
      total_count: data.total_count,
      workflow_runs: processedWorkflowRuns,
    };
  } catch (error) {
    captureException(error, {
      context: 'GitHub Actions',
      function: 'fetchSingleWorkflow',
      org,
      repo,
      action,
    });
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
    captureException(error, {
      context: 'GitHub Actions',
      function: 'processWorkflowRun',
      org,
      repo,
      runId: run.id,
      workflowName: run.name,
    });

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
        const parsedRun = JSON.parse(run) as Job[];
        return parsedRun;
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

      // Only cache successful runs
      if (allSuccess) {
        try {
          localStorage.setItem(key, JSON.stringify(workflows.jobs));
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
            results[key] = JSON.parse(cachedData) as Job[];
            return false; // Don't need to fetch this run
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
        // Use batched requests with limited concurrency to avoid rate limits
        const batchSize = 3; // Conservative batch size to avoid API rate limits
        for (let i = 0; i < cachedRuns.length; i += batchSize) {
          const batch = cachedRuns.slice(i, i + batchSize);

          // Wait for each batch to complete
          await Promise.all(
            batch.map(async (run) => {
              try {
                const key = `${run.org}/${run.repo}:${run.runId}`;
                const jobs = await fetchWorkflowJobs(run.org, run.repo, run.runId);
                results[key] = jobs;
              } catch (error) {
                captureException(error, {
                  context: 'GitHub Actions',
                  function: 'fetchMultipleWorkflowJobs - batch processing',
                  org: run.org,
                  repo: run.repo,
                  runId: run.runId,
                });
                results[`${run.org}/${run.repo}:${run.runId}`] = [];
              }
            })
          );

          // Add a delay between batches to avoid hitting rate limits
          if (i + batchSize < cachedRuns.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      return results;
    } catch (error) {
      captureException(error, {
        context: 'GitHub Actions',
        function: 'fetchMultipleWorkflowJobs',
        runsCount: workflowRuns.length,
      });
      return results; // Return partial results in case of error
    }
  });
}

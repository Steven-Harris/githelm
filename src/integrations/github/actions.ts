import { fetchData, postData } from './api-client';
import { queueApiCallIfNeeded } from './auth';
import { type Workflow,  type WorkflowRun,  type WorkflowJobs,  type Job,  type Step,  type PendingDeployments } from './types';

export async function fetchActions(org: string, repo: string, actions: string[]): Promise<Workflow[]> {
  return queueApiCallIfNeeded(async () => {
    return Promise.all(actions.map(action => fetchSingleWorkflow(org, repo, action)));
  });
}

async function fetchSingleWorkflow(org: string, repo: string, action: string): Promise<Workflow> {
  const data = await fetchData<Workflow>(
    `https://api.github.com/repos/${org}/${repo}/actions/workflows/${action}/runs?per_page=1`
  );
  
  const processedWorkflowRuns = await Promise.all(
    data.workflow_runs.map(run => processWorkflowRun(org, repo, run))
  );
  
  return {
    name: action,
    total_count: data.total_count,
    workflow_runs: processedWorkflowRuns
  };
}

async function processWorkflowRun(org: string, repo: string, run: WorkflowRun): Promise<WorkflowRun> {
  const jobs = await fetchWorkflowJobs(org, repo, run.id.toString());
  
  return {
    ...run,
    workflow_jobs: {
      total_count: jobs.length,
      jobs: jobs.map(job => ({
        ...job,
        steps: filterSuccessfulSteps(job.steps)
      }))
    }
  };
}

export function filterSuccessfulSteps(steps: Step[]): Step[] {
  return steps.filter(step => {
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
        console.error('Error parsing cached workflow jobs:', e);
      }
    }

    const workflows = await fetchData<WorkflowJobs>(`https://api.github.com/repos/${org}/${repo}/actions/runs/${runId}/jobs`);
    
    let allSuccess = true;

    // Filter jobs based on status and conclusion
    workflows.jobs = workflows.jobs.filter(job => {
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
      localStorage.setItem(key, JSON.stringify(workflows.jobs));
    }

    return workflows.jobs;
  });
}

export async function fetchMultipleWorkflowJobs(
  workflowRuns: Array<{org: string, repo: string, runId: string}>
): Promise<Record<string, Job[]>> {
  return queueApiCallIfNeeded(async () => {
    const results: Record<string, Job[]> = {};
    
    // Check localStorage cache first for all runs
    const cachedRuns = workflowRuns.filter(run => {
      const key = `${run.org}/${run.repo}:${run.runId}`;
      const cachedData = localStorage.getItem(key);
      
      if (cachedData !== null && cachedData !== undefined) {
        try {
          results[key] = JSON.parse(cachedData) as Job[];
          return false; // Don't need to fetch this run
        } catch (e) {
          console.error('Error parsing cached workflow jobs:', e);
          return true; // Need to fetch if JSON parsing fails
        }
      }
      
      return true; // Need to fetch this run
    });
    
    // If we have runs that need fetching
    if (cachedRuns.length > 0) {
      // Use batched requests with limited concurrency to avoid rate limits
      const batchSize = 3;  // Conservative batch size to avoid API rate limits
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
              console.error(`Error fetching jobs for ${run.org}/${run.repo} run ${run.runId}:`, error);
              results[`${run.org}/${run.repo}:${run.runId}`] = [];
            }
          })
        );
        
        // Add a delay between batches to avoid hitting rate limits
        if (i + batchSize < cachedRuns.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return results;
  });
}
<script lang="ts">
  import { type Job } from '$integrations/github';
  import { timeAgo } from '$shared/utils/date-utils';

  let { run, jobs = [] } = $props();

  function jobTone(job: Job): string {
    if (job.status === 'completed' && job.conclusion === 'success') return 'success';
    if (job.conclusion === 'failure') return 'failure';
    if (job.status === 'waiting' || job.status === 'queued') return 'pending';
    if (job.status === 'in_progress') return 'in_progress';
    return 'neutral';
  }

  // Helper function to get the status class for the workflow status icon
  function getStatusClass(status: string): string {
    if (status === 'success' || status === 'completed') {
      return 'success';
    } else if (status === 'failure' || status === 'failed') {
      return 'failure';
    } else if (status === 'in_progress' || status === 'queued') {
      return 'in_progress';
    } else {
      return 'pending';
    }
  }

  const statusClass = $derived(getStatusClass(run.conclusion || run.status));

  // Format the status string for display
  function formatStatus(status: string): string {
    if (status === 'completed') return 'Success';
    if (status === 'in_progress') return 'In progress';
    if (status === 'queued') return 'Queued';
    if (status === 'waiting') return 'Waiting';

    // Capitalize first letter
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
</script>

<div class="workflow-run">
  <div class="flex justify-between items-start gap-3">
    <div class="flex-1 min-w-0">
      <a href={run.html_url} target="_blank" rel="noopener" class="run-name">
        {run.name}
      </a>
      {#if run.display_title}
        <div class="run-subtitle">{run.display_title}</div>
      {/if}
      <div class="flex items-center flex-wrap gap-2 mt-2">
        <span class={`status-pill ${statusClass}`}>
          <span class="status-dot" class:beacon-live={statusClass === 'in_progress'}></span>
          {formatStatus(run.conclusion || run.status)}
        </span>
        {#if run.head_branch}
          <span class="pill">
            <svg aria-hidden="true" height="11" viewBox="0 0 16 16" width="11" class="fill-current">
              <path
                d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"
              ></path>
            </svg>
            {run.head_branch}
          </span>
        {/if}
      </div>
    </div>
    <div class="run-meta">
      <span>#{run.run_number}</span>
      {#if run.created_at}
        <span>{timeAgo(run.created_at)}</span>
      {/if}
    </div>
  </div>

  {#if jobs?.length}
    <div class="mt-3 flex flex-wrap gap-1.5">
      {#each jobs as job, i (i)}
        <span class={`job-chip ${jobTone(job)}`}>{job.name}</span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .run-name {
    display: block;
    color: var(--text);
    font-size: 0.9375rem;
    font-weight: 500;
    line-height: 1.35;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 150ms var(--ease);
  }

  .run-name:hover {
    color: var(--beacon-bright);
  }

  .run-subtitle {
    margin-top: 0.125rem;
    font-size: 0.8125rem;
    color: var(--text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .run-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.125rem;
    flex: none;
    font-size: 0.75rem;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.1875rem 0.5rem 0.1875rem 0.4375rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
    border: 1px solid currentColor;
    background: color-mix(in srgb, currentColor 12%, transparent);
  }

  .status-pill .status-dot {
    width: 6px;
    height: 6px;
  }

  .status-pill.success {
    color: var(--success);
  }

  .status-pill.failure {
    color: var(--danger);
  }

  .status-pill.in_progress {
    color: var(--beacon);
  }

  .status-pill.pending {
    color: var(--warn);
  }

  .job-chip {
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    font-size: 0.6875rem;
    border: 1px solid currentColor;
    background: color-mix(in srgb, currentColor 12%, transparent);
  }

  .job-chip.success {
    color: var(--success);
  }
  .job-chip.failure {
    color: var(--danger);
  }
  .job-chip.in_progress {
    color: var(--beacon);
  }
  .job-chip.pending {
    color: var(--warn);
  }
  .job-chip.neutral {
    color: var(--text-faint);
  }
</style>

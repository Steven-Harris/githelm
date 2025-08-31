<script lang="ts">
  import { type Job } from '$integrations/github';
  import { timeAgo } from '$shared/utils/date-utils';

  let { run, jobs = [] } = $props();

  const jobColor = (job: Job) => {
    if (job.status === 'completed' && job.conclusion === 'success') {
      return 'bg-sky-600 border-sky-800 text-white';
    } else if (job.conclusion === 'failure') {
      return 'bg-red-200 border-red-600';
    } else if (job.status === 'waiting') {
      return 'bg-yellow-500 border-yellow-800';
    } else if (job.status === 'in_progress') {
      return 'bg-sky-300 border-sky-800';
    } else {
      return 'bg-gray-300 border-gray-300';
    }
  };

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

  // Helper function to get the text class for the workflow status text
  function getStatusTextClass(status: string): string {
    return getStatusClass(status);
  }

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
  <div class="flex justify-between">
    <div class="flex-1 min-w-0">
      <a href={run.html_url} target="_blank" class="text-[#58a6ff] hover:text-[#79c0ff] text-sm font-medium hover:underline block truncate">
        {run.name}
        <span class="text-sm text-[#8b949e] ml-1">
          {run.display_title}
        </span>
      </a>
      <div class="flex items-center flex-wrap mt-1">
        <span class={`workflow-status-icon ${getStatusClass(run.conclusion || run.status)}`}></span>
        <span class={`workflow-status-text ${getStatusTextClass(run.conclusion || run.status)}`}>
          {formatStatus(run.conclusion || run.status)}
        </span>
      </div>
    </div>
    <div class="text-right flex flex-col items-end">
      <div class="text-sm text-[#8b949e] flex items-center gap-1">
        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="fill-[#8b949e]">
          <path
            d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"
          ></path>
        </svg>
        Run #{run.run_number}
        {#if run.created_at}
          <span class="text-[#8b949e] ml-1">
            {timeAgo(run.created_at)}
          </span>
        {/if}
      </div>
      {#if run.head_branch}
        <div class="mt-1 px-2 py-0.5 rounded-full bg-[#21262d] text-xs text-[#c9d1d9] border border-[#30363d] flex items-center gap-1">
          <svg aria-hidden="true" height="12" viewBox="0 0 16 16" version="1.1" width="12" class="fill-current">
            <path
              d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"
            ></path>
          </svg>
          {run.head_branch}
        </div>
      {/if}
    </div>
  </div>

  {#if jobs?.length}
    <div class="mt-3 flex flex-wrap gap-2">
      {#each jobs as job, i (i)}
        <div class={`px-2 py-0.5 rounded text-xs ${jobColor(job)}`}>
          {job.name}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .workflow-status-icon {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    margin-right: 0.5rem;
    display: inline-block;
    position: relative;
  }

  .workflow-status-icon.success::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    margin-top: -4px;
    margin-left: -4px;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="white"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>');
    background-repeat: no-repeat;
  }

  .workflow-status-icon.failure::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    margin-top: -4px;
    margin-left: -4px;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="white"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path></svg>');
    background-repeat: no-repeat;
  }

  .workflow-status-icon.pending::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    margin-top: -4px;
    margin-left: -4px;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="white"><path d="M8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"></path></svg>');
    background-repeat: no-repeat;
  }

  .workflow-status-icon.in_progress::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    margin-top: -4px;
    margin-left: -4px;
    animation: pulse 2s infinite;
  }

  .workflow-status-icon.success {
    background-color: #2ea043;
  }

  .workflow-status-icon.failure {
    background-color: #f85149;
  }

  .workflow-status-icon.pending {
    background-color: #bf8700;
  }

  .workflow-status-icon.in_progress {
    background-color: #3fb950;
    position: relative;
  }

  .workflow-status-text.success {
    color: #3fb950;
  }

  .workflow-status-text.failure {
    color: #f85149;
  }

  .workflow-status-text.pending {
    color: #d29922;
  }

  .workflow-status-text.in_progress {
    color: #3fb950;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(63, 185, 80, 0.7);
    }
    70% {
      box-shadow: 0 0 0 6px rgba(63, 185, 80, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(63, 185, 80, 0);
    }
  }
</style>

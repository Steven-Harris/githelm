<script lang="ts">
  import { workflowStatusFilters, toggleWorkflowStatusFilter, type WorkflowStatus } from "$lib/stores/workflow-status-filter.store";

  // Define color classes for different statuses
  const statusColors = {
    success: "bg-[#2ea043] border-[#238636]",
    failure: "bg-[#f85149] border-[#da3633]",
    in_progress: "bg-[#3fb950] border-[#2ea043]",
    queued: "bg-[#bf8700] border-[#9e6a03]",
    pending: "bg-[#bf8700] border-[#9e6a03]",
  };

  const statusNames = {
    success: "Success",
    failure: "Failure",
    in_progress: "In Progress",
    queued: "Queued",
    pending: "Pending",
  };
</script>

<div class="flex items-center gap-2">
  <span class="text-xs text-[#8b949e]">Filter:</span>
  <div class="flex flex-wrap gap-1">
    {#each Object.entries($workflowStatusFilters) as [status, enabled]}
      <button
        type="button"
        class={`px-2 py-0.5 rounded-full text-xs border transition-opacity flex items-center gap-1
          ${enabled ? 'opacity-100' : 'opacity-40'} 
          ${statusColors[status as WorkflowStatus]} text-white`}
        onclick={() => toggleWorkflowStatusFilter(status as WorkflowStatus)}
        title={enabled ? `Hide ${statusNames[status as WorkflowStatus]} workflows` : `Show ${statusNames[status as WorkflowStatus]} workflows`}
      >
        <span class="w-2 h-2 rounded-full bg-white"></span>
        {statusNames[status as WorkflowStatus]}
      </button>
    {/each}
  </div>
</div>
<script lang="ts">
  let { org, repo } = $props();
</script>

<div class="hero-card">
  <div class="repo-head">
    <span class="disclosure-space" aria-hidden="true"></span>
    <h3 class="repo-name"><span class="repo-org">{org}/</span>{repo}</h3>
    <span class="ml-auto skel skel-pill" aria-hidden="true"></span>
  </div>

  <ul class="row-list">
    {#each Array(2) as _, index (index)}
      <li class="skel-row">
        <span class="skel skel-avatar" aria-hidden="true"></span>
        <span class="flex-1 min-w-0 flex flex-col gap-2">
          <span class="skel skel-line" style="width: {index === 0 ? '78%' : '54%'}" aria-hidden="true"></span>
          <span class="skel skel-line skel-line-sm" style="width: 42%" aria-hidden="true"></span>
        </span>
      </li>
    {/each}
  </ul>

  <p class="skel-footer">Loading workflow runs…</p>
</div>

<style>
  .disclosure-space {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
  }

  .skel-row {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    padding: 0.875rem 1rem;
  }

  .skel {
    display: block;
    border-radius: 6px;
    background: linear-gradient(90deg, rgba(148, 168, 205, 0.07) 0%, rgba(148, 168, 205, 0.16) 50%, rgba(148, 168, 205, 0.07) 100%);
    background-size: 200% 100%;
    animation: sweep 1.6s var(--ease) infinite;
  }

  .skel-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .skel-line {
    height: 0.75rem;
  }

  .skel-line-sm {
    height: 0.5rem;
  }

  .skel-pill {
    width: 56px;
    height: 22px;
    border-radius: 999px;
  }

  .skel-footer {
    padding: 0.625rem 1rem;
    border-top: 1px solid var(--line);
    font-size: 0.75rem;
    color: var(--text-faint);
    text-align: center;
  }

  @keyframes sweep {
    from {
      background-position: 200% 0;
    }
    to {
      background-position: -200% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skel {
      animation: none;
      background: rgba(148, 168, 205, 0.1);
    }
  }
</style>

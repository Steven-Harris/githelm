<script lang="ts">
  let { org, repo, filterHint = '' } = $props();
</script>

<div class="hero-card">
  <div class="repo-head">
    <span class="disclosure-space" aria-hidden="true"></span>
    <h3 class="repo-name">
      <a href={`https://github.com/${org}/${repo}/actions`} target="_blank" rel="noopener" class="link" title={`${org}/${repo}`}>
        <span class="repo-org">{org}/</span>{repo}
      </a>
    </h3>
    <span class="ml-auto pill"><span class="status-dot beacon-live" style="color: var(--beacon)"></span>Loading</span>
  </div>

  <p class="hint">Checking for {filterHint || 'workflow runs'}…</p>
</div>

<style>
  .disclosure-space {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
  }

  .hint {
    padding: 1.25rem 1rem;
    text-align: center;
    font-size: 0.8125rem;
    color: var(--text-faint);
  }
</style>

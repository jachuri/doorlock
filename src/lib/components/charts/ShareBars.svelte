<script>
  import { onMount } from 'svelte';
  import { formatCurrency, formatPercent } from '$lib/utils.js';

  let { items = [] } = $props();

  let total = $derived(items.reduce((s, i) => s + i.value, 0) || 1);
  let maxVal = $derived(Math.max(1, ...items.map((i) => i.value)));

  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });
</script>

<div class="share-bars">
  {#each items as item}
    <div class="share-row">
      <div class="share-head">
        <span class="share-label">{item.label}</span>
        <span class="share-value">{formatCurrency(item.value)} · {formatPercent((item.value / total) * 100)}</span>
      </div>
      <div class="share-track">
        <div class="share-fill" style:width={mounted ? `${(item.value / maxVal) * 100}%` : '0%'}></div>
      </div>
    </div>
  {/each}
</div>

<style>
  .share-bars {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .share-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .share-head {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    font-size: var(--text-sm);
  }

  .share-label {
    color: var(--text-secondary);
    font-weight: var(--weight-medium);
  }

  .share-value {
    font-family: var(--font-mono);
    color: var(--text-primary);
    white-space: nowrap;
  }

  .share-track {
    height: 8px;
    border-radius: var(--radius-full);
    background: var(--bg-surface);
    overflow: hidden;
  }

  .share-fill {
    height: 100%;
    border-radius: var(--radius-full);
    background: var(--accent);
    transition: width 900ms var(--ease-out);
  }
</style>

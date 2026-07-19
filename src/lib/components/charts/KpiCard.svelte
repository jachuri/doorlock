<script>
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { formatCurrency, formatNumber, formatPercent } from '$lib/utils.js';

  let {
    label,
    value = 0,
    format = 'currency', // 'currency' | 'percent' | 'count'
    deltaPercent = null,
    deltaUnit = '%',
    deltaLabel = '전월 대비',
  } = $props();

  const display = tweened(0, { duration: 700, easing: cubicOut });

  $effect(() => {
    display.set(value);
  });

  /** @param {number} v */
  function formatValue(v) {
    if (format === 'percent') return formatPercent(v);
    if (format === 'count') return `${formatNumber(Math.round(v))}건`;
    return formatCurrency(Math.round(v));
  }

  let deltaPositive = $derived((deltaPercent ?? 0) >= 0);
</script>

<div class="kpi-card">
  <span class="kpi-label">{label}</span>
  <span class="kpi-value">{formatValue($display)}</span>
  {#if deltaPercent !== null}
    <span class="kpi-delta" class:positive={deltaPositive} class:negative={!deltaPositive}>
      {deltaPositive ? '▲' : '▼'} {deltaLabel} {formatPercent(Math.abs(deltaPercent)).replace('%', '')}{deltaUnit}
    </span>
  {/if}
</div>

<style>
  .kpi-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    background: var(--bg-raised);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }

  .kpi-label {
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .kpi-value {
    font-family: var(--font-mono);
    font-size: var(--text-3xl);
    font-weight: var(--weight-bold);
    letter-spacing: -0.03em;
  }

  .kpi-delta {
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
  }
  .kpi-delta.positive { color: var(--positive); }
  .kpi-delta.negative { color: var(--negative); }
</style>

<script>
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { formatNumber, formatPercent } from '$lib/utils.js';

  let {
    label,
    value = 0,
    format = 'currency', // 'currency' | 'percent' | 'count' | 'ratio'
    unavailable = false,
    deltaPercent = null,
    deltaUnit = '%',
    deltaLabel = '전월 대비',
    size = 'lg', // 'lg' | 'sm'
    tone = 'none', // 'none' | 'auto'(부호에 따라 녹/적)
    invertDelta = false, // 광고비 비중처럼 "증가 = 나쁨"인 지표
  } = $props();

  const display = tweened(0, { duration: 700, easing: cubicOut });

  $effect(() => {
    display.set(unavailable ? 0 : value);
  });

  let deltaUp = $derived((deltaPercent ?? 0) >= 0);
  let deltaGood = $derived(invertDelta ? !deltaUp : deltaUp);
  let valueTone = $derived(tone === 'auto' ? (value < 0 ? 'negative' : 'positive') : '');
</script>

<div class="kpi-card size-{size}">
  <span class="kpi-label">{label}</span>
  <span class="kpi-value num {valueTone}">
    {#if unavailable}
      —
    {:else if format === 'percent'}
      {formatPercent($display)}
    {:else if format === 'count'}
      {formatNumber(Math.round($display))}<span class="won">건</span>
    {:else if format === 'ratio'}
      {$display.toFixed(1)}x
    {:else}
      {$display < 0 ? '-' : ''}{formatNumber(Math.abs(Math.round($display)))}<span class="won">원</span>
    {/if}
  </span>
  {#if !unavailable && deltaPercent !== null}
    <span class="kpi-delta" class:good={deltaGood} class:bad={!deltaGood}>
      <span class="delta-chip">{deltaUp ? '▲' : '▼'} {formatPercent(Math.abs(deltaPercent)).replace('%', '')}{deltaUnit}</span>
      <span class="delta-label">{deltaLabel}</span>
    </span>
  {/if}
</div>

<style>
  .kpi-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
    background: var(--bg-raised);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: var(--space-5) var(--space-6);
  }

  .kpi-label {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--text-secondary);
  }

  .kpi-value {
    font-size: var(--text-3xl);
    font-weight: var(--weight-heavy);
    letter-spacing: -0.035em;
    line-height: 1.15;
  }

  .size-sm {
    padding: var(--space-4) var(--space-5);
    gap: var(--space-1);
  }
  .size-sm .kpi-value {
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
  }

  .kpi-delta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    flex-wrap: wrap;
  }
  .delta-chip {
    padding: 1px var(--space-2);
    border-radius: var(--radius-sm);
    font-weight: var(--weight-bold);
  }
  .good .delta-chip { background: var(--positive-muted); color: var(--positive); }
  .bad .delta-chip { background: var(--negative-muted); color: var(--negative); }
  .delta-label { color: var(--text-tertiary); }
  .size-sm .kpi-delta { font-size: var(--text-xs); }
</style>

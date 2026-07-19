<script>
  import { onMount } from 'svelte';
  import { formatCurrency } from '$lib/utils.js';

  let { data = [], height = 110 } = $props();

  const width = 600;
  const padding = { top: 10, right: 4, bottom: 4, left: 4 };
  const chartW = width - padding.left - padding.right;
  let chartH = $derived(height - padding.top - padding.bottom);

  let maxVal = $derived(Math.max(1, ...data));

  let points = $derived(
    data.map((v, i) => {
      const x = padding.left + (data.length > 1 ? (chartW * i) / (data.length - 1) : chartW / 2);
      const y = padding.top + chartH - (v / maxVal) * chartH;
      return { x, y };
    })
  );

  let linePath = $derived(points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '));
  let areaPath = $derived(
    points.length
      ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`
      : ''
  );

  let mounted = $state(false);
  let pathEl = $state(/** @type {SVGPathElement | null} */ (null));
  let pathLength = $state(0);

  onMount(() => {
    mounted = true;
  });

  $effect(() => {
    if (pathEl && linePath) pathLength = pathEl.getTotalLength();
  });

  let hoveredIndex = $state(/** @type {number | null} */ (null));
  let hoveredPoint = $derived(hoveredIndex !== null ? points[hoveredIndex] : null);
  let hoveredValue = $derived(hoveredIndex !== null ? data[hoveredIndex] : 0);
</script>

<div class="sparkline">
  <div class="chart-area">
    <svg viewBox="0 0 {width} {height}" preserveAspectRatio="none" role="img" aria-label="이번달 일별 매출 추이">
      <path class="area" d={areaPath} style:opacity={mounted ? 1 : 0} />
      <path
        bind:this={pathEl}
        class="line"
        d={linePath}
        style:stroke-dasharray={pathLength}
        style:stroke-dashoffset={mounted ? 0 : pathLength}
      />
      {#if hoveredPoint}
        <line class="hover-line" x1={hoveredPoint.x} x2={hoveredPoint.x} y1={padding.top} y2={padding.top + chartH} />
        <circle class="hover-dot" cx={hoveredPoint.x} cy={hoveredPoint.y} r="3.5" />
      {/if}
      {#each points as p, i}
        <rect
          class="hit-area"
          role="presentation"
          x={padding.left + (chartW * i) / data.length}
          y="0"
          width={chartW / data.length}
          height={height}
          onmouseenter={() => (hoveredIndex = i)}
          onmouseleave={() => (hoveredIndex = null)}
        />
      {/each}
    </svg>
    {#if hoveredPoint}
      <div class="chart-tooltip" style:left="{(hoveredPoint.x / width) * 100}%">
        <div class="tooltip-label">{(hoveredIndex ?? 0) + 1}일</div>
        <div class="tooltip-row"><span>매출</span><span class="font-mono">{formatCurrency(hoveredValue)}</span></div>
      </div>
    {/if}
  </div>
</div>

<style>
  .sparkline {
    width: 100%;
  }

  .chart-area {
    position: relative;
  }

  svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .hit-area {
    fill: transparent;
    cursor: pointer;
  }

  .hover-line {
    stroke: var(--border-default);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }

  .hover-dot {
    fill: var(--positive);
    stroke: var(--bg-raised);
    stroke-width: 2;
  }

  .chart-tooltip {
    position: absolute;
    top: 0;
    transform: translate(-50%, -100%) translateY(-8px);
    min-width: 110px;
    padding: var(--space-3) var(--space-4);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    pointer-events: none;
    z-index: 5;
  }

  .tooltip-label {
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--text-secondary);
    margin-bottom: var(--space-2);
  }

  .tooltip-row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }
  .tooltip-row .font-mono {
    color: var(--text-primary);
  }

  .area {
    fill: var(--positive-muted);
    stroke: none;
    transition: opacity var(--duration-slow) var(--ease-out);
  }

  .line {
    fill: none;
    stroke: var(--positive);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: stroke-dashoffset 900ms var(--ease-out);
  }
</style>

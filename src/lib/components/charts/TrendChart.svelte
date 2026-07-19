<script>
  import { onMount } from 'svelte';
  import { formatCurrency } from '$lib/utils.js';

  let { data = [], height = 220 } = $props();

  const width = 600;
  const padding = { top: 16, right: 8, bottom: 24, left: 8 };
  const chartW = width - padding.left - padding.right;
  let chartH = $derived(height - padding.top - padding.bottom);

  let hasAdSpend = $derived(data.some((d) => (d.adSpend || 0) > 0));
  let maxVal = $derived(Math.max(1, ...data.map((d) => Math.max(d.sales, d.adSpend || 0))));
  let minVal = $derived(Math.min(0, ...data.map((d) => d.netProfit)));
  let range = $derived(maxVal - minVal || 1);

  /** @param {number} v */
  function yFor(v) {
    return padding.top + chartH - ((v - minVal) / range) * chartH;
  }

  let slot = $derived(data.length ? chartW / data.length : 0);
  let barWidth = $derived(slot * 0.46);
  let zeroY = $derived(yFor(0));

  let bars = $derived(
    data.map((d, i) => {
      const cx = padding.left + slot * i + slot / 2;
      const y0 = yFor(0);
      const y1 = yFor(d.sales);
      return {
        label: d.label,
        sales: d.sales,
        netProfit: d.netProfit,
        adSpend: d.adSpend || 0,
        cx,
        x: cx - barWidth / 2,
        y: Math.min(y0, y1),
        h: Math.max(1, Math.abs(y0 - y1)),
      };
    })
  );

  let linePoints = $derived(bars.map((b) => `${b.cx},${yFor(b.netProfit)}`).join(' '));
  let adLinePoints = $derived(bars.map((b) => `${b.cx},${yFor(b.adSpend)}`).join(' '));

  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });

  let hoveredIndex = $state(/** @type {number | null} */ (null));
  let hovered = $derived(hoveredIndex !== null ? bars[hoveredIndex] : null);
</script>

<div class="trend-chart">
  <div class="chart-area">
    <svg viewBox="0 0 {width} {height}" preserveAspectRatio="none" role="img" aria-label="월별 매출·순수익 추이">
      <line class="zero-line" x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} />
      {#each bars as b}
        <rect class="bar" x={b.x} width={barWidth} y={mounted ? b.y : zeroY} height={mounted ? b.h : 0} />
      {/each}
      <polyline class="profit-line" points={linePoints} style:opacity={mounted ? 1 : 0} />
      {#each bars as b}
        <circle class="profit-dot" cx={b.cx} cy={yFor(b.netProfit)} r="3.5" style:opacity={mounted ? 1 : 0} />
      {/each}
      {#if hasAdSpend}
        <polyline class="ad-line" points={adLinePoints} style:opacity={mounted ? 1 : 0} />
        {#each bars as b}
          <circle class="ad-dot" cx={b.cx} cy={yFor(b.adSpend)} r="3" style:opacity={mounted ? 1 : 0} />
        {/each}
      {/if}
      {#each bars as b, i}
        <rect
          class="hit-area"
          role="presentation"
          x={padding.left + slot * i}
          y="0"
          width={slot}
          height={height}
          onmouseenter={() => (hoveredIndex = i)}
          onmouseleave={() => (hoveredIndex = null)}
        />
      {/each}
    </svg>
    {#if hovered}
      <div class="chart-tooltip" style:left="{(hovered.cx / width) * 100}%">
        <div class="tooltip-label">{hovered.label}</div>
        <div class="tooltip-row"><span>매출</span><span class="font-mono">{formatCurrency(hovered.sales)}</span></div>
        <div class="tooltip-row">
          <span>순수익</span>
          <span class="font-mono" class:positive={hovered.netProfit >= 0} class:negative={hovered.netProfit < 0}>
            {formatCurrency(hovered.netProfit)}
          </span>
        </div>
        {#if hasAdSpend}
          <div class="tooltip-row"><span>광고비</span><span class="font-mono">{formatCurrency(hovered.adSpend)}</span></div>
        {/if}
      </div>
    {/if}
  </div>
  <div class="trend-labels">
    {#each data as d}
      <span>{d.label}</span>
    {/each}
  </div>
  <div class="trend-legend">
    <span class="legend-item"><i class="dot dot-bar"></i>매출</span>
    <span class="legend-item"><i class="dot dot-line"></i>순수익</span>
    {#if hasAdSpend}
      <span class="legend-item"><i class="dot dot-ad"></i>광고비</span>
    {/if}
  </div>
</div>

<style>
  .trend-chart {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .chart-area {
    position: relative;
  }

  svg {
    width: 100%;
    height: auto;
    display: block;
    overflow: visible;
  }

  .hit-area {
    fill: transparent;
    cursor: pointer;
  }

  .chart-tooltip {
    position: absolute;
    top: 0;
    transform: translate(-50%, -100%) translateY(-8px);
    min-width: 140px;
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
  .tooltip-row .positive { color: var(--positive); }
  .tooltip-row .negative { color: var(--negative); }

  .zero-line {
    stroke: var(--border-default);
    stroke-width: 1;
  }

  .bar {
    fill: var(--accent-muted);
    stroke: var(--accent);
    stroke-width: 1;
    rx: 3;
    transition: y var(--duration-slow) var(--ease-out), height var(--duration-slow) var(--ease-out);
  }

  .profit-line {
    fill: none;
    stroke: var(--positive);
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: opacity var(--duration-slow) var(--ease-out);
  }

  .profit-dot {
    fill: var(--positive);
    transition: opacity var(--duration-slow) var(--ease-out);
  }

  .ad-line {
    fill: none;
    stroke: var(--warning);
    stroke-width: 2;
    stroke-dasharray: 4 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: opacity var(--duration-slow) var(--ease-out);
  }

  .ad-dot {
    fill: var(--warning);
    transition: opacity var(--duration-slow) var(--ease-out);
  }

  .trend-labels {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    padding: 0 var(--space-1);
  }

  .trend-legend {
    display: flex;
    gap: var(--space-4);
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
  }
  .dot-bar { background: var(--accent); }
  .dot-line { background: var(--positive); }
  .dot-ad { background: var(--warning); }
</style>

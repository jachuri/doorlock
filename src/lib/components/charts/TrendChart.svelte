<script>
  import { onMount } from 'svelte';

  let { data = [], height = 220 } = $props();

  const width = 600;
  const padding = { top: 16, right: 8, bottom: 24, left: 8 };
  const chartW = width - padding.left - padding.right;
  let chartH = $derived(height - padding.top - padding.bottom);

  let maxVal = $derived(Math.max(1, ...data.map((d) => d.sales)));
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
        netProfit: d.netProfit,
        cx,
        x: cx - barWidth / 2,
        y: Math.min(y0, y1),
        h: Math.max(1, Math.abs(y0 - y1)),
      };
    })
  );

  let linePoints = $derived(bars.map((b) => `${b.cx},${yFor(b.netProfit)}`).join(' '));

  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });
</script>

<div class="trend-chart">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="none" role="img" aria-label="월별 매출·순수익 추이">
    <line class="zero-line" x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} />
    {#each bars as b}
      <rect class="bar" x={b.x} width={barWidth} y={mounted ? b.y : zeroY} height={mounted ? b.h : 0} />
    {/each}
    <polyline class="profit-line" points={linePoints} style:opacity={mounted ? 1 : 0} />
    {#each bars as b}
      <circle class="profit-dot" cx={b.cx} cy={yFor(b.netProfit)} r="3.5" style:opacity={mounted ? 1 : 0} />
    {/each}
  </svg>
  <div class="trend-labels">
    {#each data as d}
      <span>{d.label}</span>
    {/each}
  </div>
  <div class="trend-legend">
    <span class="legend-item"><i class="dot dot-bar"></i>매출</span>
    <span class="legend-item"><i class="dot dot-line"></i>순수익</span>
  </div>
</div>

<style>
  .trend-chart {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  svg {
    width: 100%;
    height: auto;
    display: block;
    overflow: visible;
  }

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
</style>

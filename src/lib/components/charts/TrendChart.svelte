<script>
  import { onMount } from 'svelte';
  import { formatCurrency } from '$lib/utils.js';

  let { data = [], height = 240 } = $props();

  // viewBox는 가로로 늘어나도(preserveAspectRatio=none) 선 굵기는 유지(non-scaling-stroke)하고,
  // 점·라벨은 HTML로 % 위치에 그려 찌그러지지 않게 한다.
  const width = 600;
  const padding = { top: 16, right: 8, bottom: 8, left: 8 };
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
  let barWidth = $derived(Math.min(slot * 0.5, 64));
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
        profitY: yFor(d.netProfit),
        adY: yFor(d.adSpend || 0),
      };
    })
  );

  let linePoints = $derived(bars.map((b) => `${b.cx},${b.profitY}`).join(' '));
  let adLinePoints = $derived(bars.map((b) => `${b.cx},${b.adY}`).join(' '));

  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });

  let hoveredIndex = $state(/** @type {number | null} */ (null));
  let hovered = $derived(hoveredIndex !== null ? bars[hoveredIndex] : null);

  /** @param {number} x */
  const pctX = (x) => `${(x / width) * 100}%`;
  /** @param {number} y */
  const pctY = (y) => `${(y / height) * 100}%`;
</script>

<div class="trend-chart">
  <div class="chart-area" style:height="{height}px" role="img" aria-label="월별 매출·순수익 추이">
    <svg viewBox="0 0 {width} {height}" preserveAspectRatio="none" aria-hidden="true">
      <line class="zero-line" x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} />
      {#each bars as b, i}
        <rect
          class="bar"
          class:hovered={hoveredIndex === i}
          x={b.x}
          width={barWidth}
          y={mounted ? b.y : zeroY}
          height={mounted ? b.h : 0}
        />
      {/each}
      <polyline class="profit-line" points={linePoints} style:opacity={mounted ? 1 : 0} />
      {#if hasAdSpend}
        <polyline class="ad-line" points={adLinePoints} style:opacity={mounted ? 1 : 0} />
      {/if}
    </svg>

    {#each bars as b}
      <span class="dot dot-profit" style:left={pctX(b.cx)} style:top={pctY(b.profitY)} style:opacity={mounted ? 1 : 0}></span>
      {#if hasAdSpend}
        <span class="dot dot-ad" style:left={pctX(b.cx)} style:top={pctY(b.adY)} style:opacity={mounted ? 1 : 0}></span>
      {/if}
    {/each}

    {#each bars as b, i}
      <button
        type="button"
        class="hit-area"
        style:left={pctX(padding.left + slot * i)}
        style:width={pctX(slot)}
        aria-label="{b.label} 매출 {formatCurrency(b.sales)}, 순수익 {formatCurrency(b.netProfit)}"
        onpointerenter={() => (hoveredIndex = i)}
        onpointerleave={() => (hoveredIndex = null)}
        onfocus={() => (hoveredIndex = i)}
        onblur={() => (hoveredIndex = null)}
      ></button>
    {/each}

    {#if hovered}
      <div class="chart-tooltip" style:left={pctX(hovered.cx)}>
        <div class="tooltip-label">{hovered.label}</div>
        <div class="tooltip-row"><span><i class="key key-bar"></i>매출</span><span class="num">{formatCurrency(hovered.sales)}</span></div>
        <div class="tooltip-row">
          <span><i class="key key-line"></i>순수익</span>
          <span class="num" class:positive={hovered.netProfit >= 0} class:negative={hovered.netProfit < 0}>
            {formatCurrency(hovered.netProfit)}
          </span>
        </div>
        {#if hasAdSpend}
          <div class="tooltip-row"><span><i class="key key-ad"></i>광고비</span><span class="num">{formatCurrency(hovered.adSpend)}</span></div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="trend-labels">
    {#each bars as b, i}
      <span style:left={pctX(b.cx)} class:active={hoveredIndex === i}>{b.label}</span>
    {/each}
  </div>

  <div class="trend-legend">
    <span class="legend-item"><i class="key key-bar"></i>매출</span>
    <span class="legend-item"><i class="key key-line"></i>순수익</span>
    {#if hasAdSpend}
      <span class="legend-item"><i class="key key-ad"></i>광고비</span>
    {/if}
  </div>
</div>

<style>
  .trend-chart {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .chart-area {
    position: relative;
  }

  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    overflow: visible;
  }

  .zero-line {
    stroke: var(--border-default);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }

  .bar {
    fill: color-mix(in srgb, var(--accent) 38%, transparent);
    rx: 4;
    transition: y var(--duration-slow) var(--ease-out), height var(--duration-slow) var(--ease-out), fill var(--duration-fast);
  }
  .bar.hovered { fill: color-mix(in srgb, var(--accent) 60%, transparent); }

  .profit-line,
  .ad-line {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
    transition: opacity var(--duration-slow) var(--ease-out);
  }
  .profit-line { stroke: var(--positive); stroke-width: 2.5; }
  .ad-line { stroke: var(--chart-ad); stroke-width: 2; stroke-dasharray: 5 4; }

  .dot {
    position: absolute;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    border: 2px solid var(--bg-raised);
    pointer-events: none;
    transition: opacity var(--duration-slow) var(--ease-out);
  }
  .dot-profit { background: var(--positive); }
  .dot-ad { background: var(--chart-ad); width: 8px; height: 8px; }

  .hit-area {
    position: absolute;
    top: 0;
    bottom: 0;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
  }
  .hit-area:focus-visible { outline-offset: -2px; }

  .chart-tooltip {
    position: absolute;
    top: 0;
    transform: translate(-50%, -100%) translateY(-6px);
    min-width: 160px;
    padding: var(--space-3) var(--space-4);
    background: var(--bg-raised);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    pointer-events: none;
    z-index: 5;
  }

  .tooltip-label {
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    margin-bottom: var(--space-2);
  }

  .tooltip-row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    white-space: nowrap;
  }
  .tooltip-row span:first-child { display: flex; align-items: center; gap: var(--space-2); }
  .tooltip-row .num { color: var(--text-primary); font-weight: var(--weight-semibold); }
  .tooltip-row .positive { color: var(--positive); }
  .tooltip-row .negative { color: var(--negative); }

  .trend-labels {
    position: relative;
    height: 20px;
  }
  .trend-labels span {
    position: absolute;
    transform: translateX(-50%);
    font-size: var(--text-sm);
    color: var(--text-tertiary);
    white-space: nowrap;
  }
  .trend-labels span.active { color: var(--text-primary); font-weight: var(--weight-semibold); }

  .trend-legend {
    display: flex;
    gap: var(--space-5);
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .key {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }
  .key-bar { background: color-mix(in srgb, var(--accent) 55%, transparent); }
  .key-line { background: var(--positive); border-radius: 50%; }
  .key-ad { background: var(--chart-ad); border-radius: 50%; }
</style>

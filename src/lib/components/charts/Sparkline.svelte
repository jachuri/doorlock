<script>
  import { onMount } from 'svelte';
  import { formatCurrency } from '$lib/utils.js';

  let { data = [], height = 120, label = '일별 매출 추이', startDate = '' } = $props();

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
  onMount(() => {
    mounted = true;
  });

  let hoveredIndex = $state(/** @type {number | null} */ (null));
  let hoveredPoint = $derived(hoveredIndex !== null ? points[hoveredIndex] : null);
  let hoveredValue = $derived(hoveredIndex !== null ? data[hoveredIndex] : 0);

  /** @param {number} i */
  function dayLabel(i) {
    if (!startDate) return `${i + 1}일째`;
    const d = new Date(startDate + 'T00:00:00');
    d.setDate(d.getDate() + i);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  /** 마우스·터치 공통: 포인터 x 위치에서 가장 가까운 날짜 */
  /** @param {PointerEvent} e */
  function onPointerMove(e) {
    const el = /** @type {HTMLElement} */ (e.currentTarget);
    const rect = el.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const x = ratio * width;
    if (data.length <= 1) { hoveredIndex = 0; return; }
    const i = Math.round(((x - padding.left) / chartW) * (data.length - 1));
    hoveredIndex = Math.max(0, Math.min(data.length - 1, i));
  }
</script>

<div class="sparkline">
  <div
    class="chart-area"
    style:height="{height}px"
    role="img"
    aria-label={label}
    onpointermove={onPointerMove}
    onpointerdown={onPointerMove}
    onpointerleave={() => (hoveredIndex = null)}
  >
    <svg viewBox="0 0 {width} {height}" preserveAspectRatio="none" aria-hidden="true">
      <path class="area" d={areaPath} style:opacity={mounted ? 1 : 0} />
      <path class="line" d={linePath} style:opacity={mounted ? 1 : 0} />
      {#if hoveredPoint}
        <line class="hover-line" x1={hoveredPoint.x} x2={hoveredPoint.x} y1={padding.top} y2={padding.top + chartH} />
      {/if}
    </svg>
    {#if hoveredPoint}
      <span class="hover-dot" style:left="{(hoveredPoint.x / width) * 100}%" style:top="{(hoveredPoint.y / height) * 100}%"></span>
      <div class="chart-tooltip" style:left="{Math.min(Math.max((hoveredPoint.x / width) * 100, 12), 88)}%">
        <div class="tooltip-label">{dayLabel(hoveredIndex ?? 0)}</div>
        <div class="tooltip-row"><span>매출</span><span class="num">{formatCurrency(hoveredValue)}</span></div>
      </div>
    {/if}
  </div>
</div>

<style>
  .sparkline { width: 100%; }

  .chart-area {
    position: relative;
    touch-action: pan-y;
    cursor: crosshair;
  }

  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  .area {
    fill: color-mix(in srgb, var(--accent) 16%, transparent);
    stroke: none;
    transition: opacity var(--duration-slow) var(--ease-out);
  }

  .line {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
    transition: opacity var(--duration-slow) var(--ease-out);
  }

  .hover-line {
    stroke: var(--border-strong);
    stroke-width: 1;
    stroke-dasharray: 3 3;
    vector-effect: non-scaling-stroke;
  }

  .hover-dot {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    background: var(--accent);
    border: 2px solid var(--bg-raised);
    pointer-events: none;
  }

  .chart-tooltip {
    position: absolute;
    top: 0;
    transform: translate(-50%, -100%) translateY(-6px);
    min-width: 130px;
    padding: var(--space-2) var(--space-3);
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
    margin-bottom: 2px;
  }

  .tooltip-row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    white-space: nowrap;
  }
  .tooltip-row .num { color: var(--text-primary); font-weight: var(--weight-semibold); }
</style>

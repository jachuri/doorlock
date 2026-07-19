<script>
  import { onMount } from 'svelte';

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
</script>

<div class="sparkline">
  <svg viewBox="0 0 {width} {height}" preserveAspectRatio="none" role="img" aria-label="이번달 일별 매출 추이">
    <path class="area" d={areaPath} style:opacity={mounted ? 1 : 0} />
    <path
      bind:this={pathEl}
      class="line"
      d={linePath}
      style:stroke-dasharray={pathLength}
      style:stroke-dashoffset={mounted ? 0 : pathLength}
    />
  </svg>
</div>

<style>
  .sparkline {
    width: 100%;
  }

  svg {
    width: 100%;
    height: auto;
    display: block;
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

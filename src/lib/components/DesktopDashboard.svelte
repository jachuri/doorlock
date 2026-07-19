<script>
  import { onMount } from 'svelte';
  import { getServicesByDateRange, getPurchasesByDateRange } from '$lib/db.js';
  import { formatDate, formatMonth } from '$lib/utils.js';
  import KpiCard from '$lib/components/charts/KpiCard.svelte';
  import TrendChart from '$lib/components/charts/TrendChart.svelte';
  import Sparkline from '$lib/components/charts/Sparkline.svelte';
  import ShareBars from '$lib/components/charts/ShareBars.svelte';

  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const rangeStartStr = formatDate(rangeStart);
  const rangeEndStr = formatDate(now);

  let loading = $state(true);
  let services = $state([]);
  let purchases = $state([]);

  onMount(loadData);

  async function loadData() {
    loading = true;
    const [s, p] = await Promise.all([
      getServicesByDateRange(rangeStartStr, rangeEndStr),
      getPurchasesByDateRange(rangeStartStr, rangeEndStr),
    ]);
    services = s;
    purchases = p;
    loading = false;
  }

  /** @param {string} key */
  function monthLabel(key) {
    const m = Number(key.slice(5, 7));
    return `${m}월`;
  }

  // 최근 6개월(이번달 포함) 키 목록
  let monthKeys = $derived.by(() => {
    const keys = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return keys;
  });

  let currentMonthKey = $derived(monthKeys[monthKeys.length - 1]);

  let monthlyBuckets = $derived.by(() => {
    /** @type {Map<string, { key: string, label: string, sales: number, parts: number, purchase: number, adSpend: number, count: number }>} */
    const map = new Map(
      monthKeys.map((k) => [k, { key: k, label: monthLabel(k), sales: 0, parts: 0, purchase: 0, adSpend: 0, count: 0 }])
    );
    for (const s of services) {
      const b = map.get(s.date.slice(0, 7));
      if (!b) continue;
      b.sales += s.amount;
      b.parts += s.partsCost || 0;
      b.count += 1;
    }
    for (const p of purchases) {
      const b = map.get(p.date.slice(0, 7));
      if (!b) continue;
      b.purchase += p.amount;
      if (p.category === '광고') b.adSpend += p.amount;
    }
    return monthKeys.map((k) => {
      const b = /** @type {{ key: string, label: string, sales: number, parts: number, purchase: number, adSpend: number, count: number }} */ (map.get(k));
      const netProfit = b.sales - b.parts - b.purchase;
      return {
        ...b,
        netProfit,
        margin: b.sales > 0 ? (netProfit / b.sales) * 100 : 0,
        salesMargin: b.sales > 0 ? ((b.sales - b.parts) / b.sales) * 100 : 0,
        adSpendRatio: b.sales > 0 ? (b.adSpend / b.sales) * 100 : 0,
        roas: b.adSpend > 0 ? b.sales / b.adSpend : null,
      };
    });
  });

  let currentMonth = $derived(monthlyBuckets[monthlyBuckets.length - 1]);
  let prevMonth = $derived(monthlyBuckets[monthlyBuckets.length - 2]);

  /**
   * @param {number} curr
   * @param {number} prev
   */
  function growth(curr, prev) {
    if (!prev) return null;
    return ((curr - prev) / prev) * 100;
  }

  let salesGrowth = $derived(prevMonth ? growth(currentMonth.sales, prevMonth.sales) : null);
  let profitGrowth = $derived(prevMonth ? growth(currentMonth.netProfit, prevMonth.netProfit) : null);
  let countGrowth = $derived(prevMonth ? growth(currentMonth.count, prevMonth.count) : null);
  let opMarginDelta = $derived(prevMonth ? currentMonth.margin - prevMonth.margin : null);
  let salesMarginDelta = $derived(prevMonth ? currentMonth.salesMargin - prevMonth.salesMargin : null);
  let adSpendRatioDelta = $derived(prevMonth ? currentMonth.adSpendRatio - prevMonth.adSpendRatio : null);
  let roasGrowth = $derived(
    prevMonth && currentMonth.roas !== null && prevMonth.roas !== null
      ? growth(currentMonth.roas, prevMonth.roas)
      : null
  );

  // 이번달 일별 매출
  let dailySales = $derived.by(() => {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const arr = new Array(daysInMonth).fill(0);
    for (const s of services) {
      if (!s.date.startsWith(currentMonthKey)) continue;
      const day = Number(s.date.slice(8, 10));
      arr[day - 1] += s.amount;
    }
    return arr;
  });

  // 이번달 결제수단별 비중
  let paymentBreakdown = $derived.by(() => {
    const map = new Map();
    for (const s of services) {
      if (!s.date.startsWith(currentMonthKey)) continue;
      const key = s.paymentMethod || '기타';
      map.set(key, (map.get(key) || 0) + s.amount);
    }
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  });

  // 이번달 매입처 TOP 5 (+ 기타)
  let supplierBreakdown = $derived.by(() => {
    const map = new Map();
    for (const p of purchases) {
      if (!p.date.startsWith(currentMonthKey)) continue;
      const key = p.supplier || '기타';
      map.set(key, (map.get(key) || 0) + p.amount);
    }
    const sorted = [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    if (sorted.length <= 5) return sorted;
    const rest = sorted.slice(5).reduce((s, i) => s + i.value, 0);
    return [...sorted.slice(0, 5), { label: '기타', value: rest }];
  });

  // 이번달 매입 카테고리별 비중
  let categoryBreakdown = $derived.by(() => {
    const map = new Map();
    for (const p of purchases) {
      if (!p.date.startsWith(currentMonthKey)) continue;
      const key = p.category || '기타';
      map.set(key, (map.get(key) || 0) + p.amount);
    }
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  });
</script>

<div class="page report-page">
  <header class="report-header">
    <div>
      <h1>대시보드</h1>
      <span class="report-sub">{formatMonth(now.getFullYear(), now.getMonth() + 1)} 기준</span>
    </div>
    <div class="report-actions">
      <a href="/input" class="btn btn-ghost">매출 입력</a>
      <a href="/purchase" class="btn btn-primary">매입 입력</a>
    </div>
  </header>

  {#if loading}
    <div class="loading"><div class="loading-dot"></div></div>
  {:else}
    <section class="kpi-grid">
      <KpiCard label="이번달 매출" value={currentMonth.sales} format="currency" deltaPercent={salesGrowth} />
      <KpiCard label="순수익" value={currentMonth.netProfit} format="currency" deltaPercent={profitGrowth} />
      <KpiCard label="처리 건수" value={currentMonth.count} format="count" deltaPercent={countGrowth} />
      <KpiCard label="판매마진" value={currentMonth.salesMargin} format="percent" deltaPercent={salesMarginDelta} deltaUnit="%p" />
      <KpiCard label="운영마진" value={currentMonth.margin} format="percent" deltaPercent={opMarginDelta} deltaUnit="%p" />
      <KpiCard
        label="ROAS"
        value={currentMonth.roas ?? 0}
        unavailable={currentMonth.roas === null}
        format="ratio"
        deltaPercent={roasGrowth}
      />
      <KpiCard label="광고비 비중" value={currentMonth.adSpendRatio} format="percent" deltaPercent={adSpendRatioDelta} deltaUnit="%p" />
    </section>

    <section class="report-section card">
      <h2 class="section-title">월별 성장 추이 (최근 6개월)</h2>
      <TrendChart data={monthlyBuckets.map((b) => ({ label: b.label, sales: b.sales, netProfit: b.netProfit, adSpend: b.adSpend }))} />
    </section>

    <div class="report-row">
      <section class="report-section card">
        <h2 class="section-title">이번달 일별 매출 추이</h2>
        <Sparkline data={dailySales} />
      </section>

      <section class="report-section card">
        <h2 class="section-title">결제수단별 비중</h2>
        {#if paymentBreakdown.length === 0}
          <p class="empty-hint">이번달 매출 기록이 없습니다</p>
        {:else}
          <ShareBars items={paymentBreakdown} />
        {/if}
      </section>
    </div>

    <div class="report-row">
      <section class="report-section card">
        <h2 class="section-title">매입처 TOP 5</h2>
        {#if supplierBreakdown.length === 0}
          <p class="empty-hint">이번달 매입 기록이 없습니다</p>
        {:else}
          <ShareBars items={supplierBreakdown} />
        {/if}
      </section>

      <section class="report-section card">
        <h2 class="section-title">카테고리별 매입 비중</h2>
        {#if categoryBreakdown.length === 0}
          <p class="empty-hint">이번달 매입 기록이 없습니다</p>
        {:else}
          <ShareBars items={categoryBreakdown} />
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
  .report-page {
    padding: var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .report-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .report-header h1 {
    font-size: var(--text-3xl);
    font-weight: var(--weight-bold);
    letter-spacing: -0.02em;
  }

  .report-sub {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .report-actions {
    display: flex;
    gap: var(--space-3);
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: var(--space-4);
  }

  .report-row {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: var(--space-4);
  }

  .report-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .section-title {
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    color: var(--text-secondary);
  }

  .empty-hint {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .loading {
    display: flex;
    justify-content: center;
    padding: var(--space-12);
  }

  .loading-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-tertiary);
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1); }
  }

  @media (max-width: 1240px) {
    .report-row { grid-template-columns: 1fr; }
  }
</style>

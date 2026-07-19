<script>
  import { getServicesByDateRange, getPurchasesByDateRange } from '$lib/db.js';
  import {
    formatDate, formatDateDisplay,
    getThisWeekRange, getThisMonthRange, getLastMonthRange
  } from '$lib/utils.js';
  import KpiCard from '$lib/components/charts/KpiCard.svelte';
  import TrendChart from '$lib/components/charts/TrendChart.svelte';
  import Sparkline from '$lib/components/charts/Sparkline.svelte';
  import ShareBars from '$lib/components/charts/ShareBars.svelte';

  const PERIODS = [
    { key: 'today', label: '오늘' },
    { key: 'week', label: '이번 주' },
    { key: 'month', label: '이번 달' },
    { key: 'lastMonth', label: '지난 달' },
    { key: 'custom', label: '직접선택' },
  ];

  let selectedPeriod = $state('month');
  let startDate = $state('');
  let endDate = $state('');

  /** @param {string} period */
  function updateRange(period) {
    selectedPeriod = period;
    const today = formatDate();
    switch (period) {
      case 'today':
        startDate = today;
        endDate = today;
        break;
      case 'week': {
        const r = getThisWeekRange();
        startDate = r.start;
        endDate = r.end;
        break;
      }
      case 'month': {
        const r = getThisMonthRange();
        startDate = r.start;
        endDate = r.end;
        break;
      }
      case 'lastMonth': {
        const r = getLastMonthRange();
        startDate = r.start;
        endDate = r.end;
        break;
      }
      case 'custom':
        break;
    }
  }

  updateRange('month');

  // ─── 날짜 헬퍼 ───

  /** @param {string} ymd */
  function parseYmd(ymd) {
    return new Date(ymd + 'T00:00:00');
  }

  /**
   * @param {string} ymd
   * @param {number} days
   */
  function shiftDate(ymd, days) {
    const d = parseYmd(ymd);
    d.setDate(d.getDate() + days);
    return formatDate(d);
  }

  /**
   * @param {string} a
   * @param {string} b
   */
  function daysBetween(a, b) {
    return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86400000) + 1;
  }

  // ─── 이전 기간(선택 기간과 같은 길이의 직전 구간) ───
  let periodLength = $derived(startDate && endDate ? daysBetween(startDate, endDate) : 1);
  let prevEnd = $derived(startDate ? shiftDate(startDate, -1) : '');
  let prevStart = $derived(prevEnd ? shiftDate(prevEnd, -(periodLength - 1)) : '');

  // 추이 그래프용 — 종료일 기준 24개월 전 1일부터 (표시는 최근 12개월까지로 상한)
  let trendStart = $derived.by(() => {
    if (!endDate) return '';
    const d = parseYmd(endDate);
    return formatDate(new Date(d.getFullYear(), d.getMonth() - 23, 1));
  });

  let fetchStart = $derived.by(() => {
    if (!prevStart || !trendStart) return '';
    return prevStart < trendStart ? prevStart : trendStart;
  });

  let loading = $state(true);
  let services = $state([]);
  let purchases = $state([]);

  $effect(() => {
    if (fetchStart && endDate) loadData(fetchStart, endDate);
  });

  /**
   * @param {string} start
   * @param {string} end
   */
  async function loadData(start, end) {
    loading = true;
    const [s, p] = await Promise.all([
      getServicesByDateRange(start, end),
      getPurchasesByDateRange(start, end),
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

  // trendStart~endDate 사이 월 키 목록 (연속)
  let allMonthKeys = $derived.by(() => {
    if (!trendStart || !endDate) return [];
    const start = parseYmd(trendStart);
    const end = parseYmd(endDate);
    const keys = [];
    let y = start.getFullYear();
    let m = start.getMonth();
    const endY = end.getFullYear();
    const endM = end.getMonth();
    while (y < endY || (y === endY && m <= endM)) {
      keys.push(`${y}-${String(m + 1).padStart(2, '0')}`);
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
    return keys;
  });

  // 월별 추이 — 데이터 없는 앞쪽 달은 잘라내고, 최근 12개월까지만 표시
  let monthlyBuckets = $derived.by(() => {
    /** @type {Map<string, { key: string, label: string, sales: number, parts: number, purchase: number, adSpend: number, inventoryPurchase: number, count: number }>} */
    const map = new Map(
      allMonthKeys.map((k) => [
        k,
        { key: k, label: monthLabel(k), sales: 0, parts: 0, purchase: 0, adSpend: 0, inventoryPurchase: 0, count: 0 },
      ])
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
      if (p.category === '재고') b.inventoryPurchase += p.amount;
    }

    let keys = allMonthKeys;
    const firstIdx = keys.findIndex((k) => {
      const b = /** @type {{ sales: number, purchase: number, count: number }} */ (map.get(k));
      return b.sales > 0 || b.purchase > 0 || b.count > 0;
    });
    keys = firstIdx === -1 ? keys.slice(-1) : keys.slice(firstIdx);
    if (keys.length > 12) keys = keys.slice(keys.length - 12);

    return keys.map((k) => {
      const b = /** @type {{ key: string, label: string, sales: number, parts: number, purchase: number, adSpend: number, inventoryPurchase: number, count: number }} */ (map.get(k));
      const netProfit = b.sales - b.parts - b.purchase;
      const salesCost = b.parts + b.inventoryPurchase;
      return {
        ...b,
        netProfit,
        margin: b.sales > 0 ? (netProfit / b.sales) * 100 : 0,
        salesMargin: b.sales > 0 ? ((b.sales - salesCost) / b.sales) * 100 : 0,
        adSpendRatio: b.sales > 0 ? (b.adSpend / b.sales) * 100 : 0,
        roas: b.adSpend > 0 ? b.sales / b.adSpend : null,
      };
    });
  });

  // ─── 선택 기간 / 이전 기간 집계 ───

  /**
   * @param {string} start
   * @param {string} end
   */
  function aggregateRange(start, end) {
    let sales = 0, parts = 0, purchase = 0, adSpend = 0, inventoryPurchase = 0, count = 0;
    for (const s of services) {
      if (s.date < start || s.date > end) continue;
      sales += s.amount;
      parts += s.partsCost || 0;
      count += 1;
    }
    for (const p of purchases) {
      if (p.date < start || p.date > end) continue;
      purchase += p.amount;
      if (p.category === '광고') adSpend += p.amount;
      if (p.category === '재고') inventoryPurchase += p.amount;
    }
    const netProfit = sales - parts - purchase;
    const salesCost = parts + inventoryPurchase;
    return {
      sales, parts, purchase, adSpend, inventoryPurchase, count, netProfit,
      margin: sales > 0 ? (netProfit / sales) * 100 : 0,
      salesMargin: sales > 0 ? ((sales - salesCost) / sales) * 100 : 0,
      adSpendRatio: sales > 0 ? (adSpend / sales) * 100 : 0,
      roas: adSpend > 0 ? sales / adSpend : null,
    };
  }

  let currentPeriod = $derived(aggregateRange(startDate, endDate));
  let prevPeriod = $derived(prevStart && prevEnd ? aggregateRange(prevStart, prevEnd) : null);

  /**
   * @param {number} curr
   * @param {number} prev
   */
  function growth(curr, prev) {
    if (!prev) return null;
    return ((curr - prev) / prev) * 100;
  }

  let salesGrowth = $derived(prevPeriod ? growth(currentPeriod.sales, prevPeriod.sales) : null);
  let profitGrowth = $derived(prevPeriod ? growth(currentPeriod.netProfit, prevPeriod.netProfit) : null);
  let countGrowth = $derived(prevPeriod ? growth(currentPeriod.count, prevPeriod.count) : null);
  let opMarginDelta = $derived(prevPeriod ? currentPeriod.margin - prevPeriod.margin : null);
  let salesMarginDelta = $derived(prevPeriod ? currentPeriod.salesMargin - prevPeriod.salesMargin : null);
  let adSpendRatioDelta = $derived(prevPeriod ? currentPeriod.adSpendRatio - prevPeriod.adSpendRatio : null);
  let roasGrowth = $derived(
    prevPeriod && currentPeriod.roas !== null && prevPeriod.roas !== null
      ? growth(currentPeriod.roas, prevPeriod.roas)
      : null
  );

  // 선택 기간 일별 매출
  let dailySales = $derived.by(() => {
    if (!startDate || !endDate) return [];
    const start = parseYmd(startDate);
    const days = Math.max(daysBetween(startDate, endDate), 1);
    const arr = new Array(days).fill(0);
    for (const s of services) {
      if (s.date < startDate || s.date > endDate) continue;
      const idx = Math.round((parseYmd(s.date).getTime() - start.getTime()) / 86400000);
      if (idx >= 0 && idx < arr.length) arr[idx] += s.amount;
    }
    return arr;
  });

  // 선택 기간 결제수단별 비중
  let paymentBreakdown = $derived.by(() => {
    const map = new Map();
    for (const s of services) {
      if (s.date < startDate || s.date > endDate) continue;
      const key = s.paymentMethod || '기타';
      map.set(key, (map.get(key) || 0) + s.amount);
    }
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  });

  // 선택 기간 매입처 TOP 5 (+ 기타)
  let supplierBreakdown = $derived.by(() => {
    const map = new Map();
    for (const p of purchases) {
      if (p.date < startDate || p.date > endDate) continue;
      const key = p.supplier || '기타';
      map.set(key, (map.get(key) || 0) + p.amount);
    }
    const sorted = [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    if (sorted.length <= 5) return sorted;
    const rest = sorted.slice(5).reduce((s, i) => s + i.value, 0);
    return [...sorted.slice(0, 5), { label: '기타', value: rest }];
  });

  // 선택 기간 매입 카테고리별 비중
  let categoryBreakdown = $derived.by(() => {
    const map = new Map();
    for (const p of purchases) {
      if (p.date < startDate || p.date > endDate) continue;
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
      <div class="period-filter">
        <div class="chip-group">
          {#each PERIODS as p}
            <button class="chip" class:active={selectedPeriod === p.key} onclick={() => updateRange(p.key)}>
              {p.label}
            </button>
          {/each}
        </div>
        {#if selectedPeriod === 'custom'}
          <div class="custom-range">
            <input type="date" class="input-field input-sm" bind:value={startDate} />
            <span class="range-separator">~</span>
            <input type="date" class="input-field input-sm" bind:value={endDate} />
          </div>
        {:else}
          <p class="range-display">{formatDateDisplay(startDate)} ~ {formatDateDisplay(endDate)}</p>
        {/if}
      </div>
    </div>
    <div class="report-actions">
      <a href="/input" class="btn btn-ghost">매출 입력</a>
      <a href="/purchase" class="btn btn-primary">매입 입력</a>
    </div>
  </header>

  {#if loading}
    <div class="loading"><div class="loading-dot"></div></div>
  {:else}
    <section class="kpi-section">
      <div class="kpi-row kpi-row-3">
        <KpiCard label="매출" value={currentPeriod.sales} format="currency" deltaPercent={salesGrowth} deltaLabel="이전 기간 대비" />
        <KpiCard label="순수익" value={currentPeriod.netProfit} format="currency" deltaPercent={profitGrowth} deltaLabel="이전 기간 대비" />
        <KpiCard label="처리 건수" value={currentPeriod.count} format="count" deltaPercent={countGrowth} deltaLabel="이전 기간 대비" />
      </div>
      <div class="kpi-row kpi-row-2">
        <KpiCard label="판매마진" value={currentPeriod.salesMargin} format="percent" deltaPercent={salesMarginDelta} deltaUnit="%p" deltaLabel="이전 기간 대비" />
        <KpiCard label="운영마진" value={currentPeriod.margin} format="percent" deltaPercent={opMarginDelta} deltaUnit="%p" deltaLabel="이전 기간 대비" />
      </div>
      <div class="kpi-row kpi-row-2">
        <KpiCard
          label="ROAS"
          value={(currentPeriod.roas ?? 0) * 100}
          unavailable={currentPeriod.roas === null}
          format="percent"
          deltaPercent={roasGrowth}
          deltaLabel="이전 기간 대비"
        />
        <KpiCard label="광고비 비중" value={currentPeriod.adSpendRatio} format="percent" deltaPercent={adSpendRatioDelta} deltaUnit="%p" deltaLabel="이전 기간 대비" />
      </div>
    </section>

    <section class="report-section card">
      <h2 class="section-title">월별 성장 추이</h2>
      <TrendChart data={monthlyBuckets.map((b) => ({ label: b.label, sales: b.sales, netProfit: b.netProfit, adSpend: b.adSpend }))} />
    </section>

    <div class="report-row">
      <section class="report-section card">
        <h2 class="section-title">일별 매출 추이</h2>
        <Sparkline data={dailySales} />
      </section>

      <section class="report-section card">
        <h2 class="section-title">결제수단별 비중</h2>
        {#if paymentBreakdown.length === 0}
          <p class="empty-hint">매출 기록이 없습니다</p>
        {:else}
          <ShareBars items={paymentBreakdown} />
        {/if}
      </section>
    </div>

    <div class="report-row">
      <section class="report-section card">
        <h2 class="section-title">매입처 TOP 5</h2>
        {#if supplierBreakdown.length === 0}
          <p class="empty-hint">매입 기록이 없습니다</p>
        {:else}
          <ShareBars items={supplierBreakdown} />
        {/if}
      </section>

      <section class="report-section card">
        <h2 class="section-title">카테고리별 매입 비중</h2>
        {#if categoryBreakdown.length === 0}
          <p class="empty-hint">매입 기록이 없습니다</p>
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

  .period-filter {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-top: var(--space-3);
    flex-wrap: wrap;
  }

  .range-display {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .custom-range {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .range-separator {
    color: var(--text-tertiary);
    font-size: var(--text-sm);
  }
  .input-sm {
    font-size: var(--text-sm);
    padding: var(--space-2) var(--space-3);
  }

  .report-actions {
    display: flex;
    gap: var(--space-3);
  }

  .kpi-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .kpi-row {
    display: grid;
    gap: var(--space-4);
  }
  .kpi-row-3 {
    grid-template-columns: repeat(3, 1fr);
  }
  .kpi-row-2 {
    grid-template-columns: repeat(2, 1fr);
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

  input[type="date"] { color-scheme: dark; }
</style>

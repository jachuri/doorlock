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
  import Icon from '$lib/components/Icon.svelte';

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

  // ─── 이전 기간 ───
  // 주/월 프리셋은 캘린더상 대응 구간(지난주 같은 요일, 지난달 같은 날짜)과 비교하고,
  // 오늘/직접선택은 선택 기간과 같은 길이의 직전 구간과 비교한다.
  // (예: "이번 주"가 월~금이면 지난주 월~금과 비교해야지, 주말 낀 직전 5일과 비교하면 안 됨.
  //  "이번 달" 31일 구간도 지난달 전체와 비교해야지, 직전 31일(월 경계가 하루 밀림)과 비교하면 안 됨.)

  /**
   * @param {string} ymd
   * @param {number} months
   */
  function shiftMonthClamped(ymd, months) {
    const d = parseYmd(ymd);
    const day = d.getDate();
    const targetFirst = new Date(d.getFullYear(), d.getMonth() + months, 1);
    const lastDay = new Date(targetFirst.getFullYear(), targetFirst.getMonth() + 1, 0).getDate();
    targetFirst.setDate(Math.min(day, lastDay));
    return formatDate(targetFirst);
  }

  let periodLength = $derived(startDate && endDate ? daysBetween(startDate, endDate) : 1);
  let prevStart = $derived.by(() => {
    if (!startDate) return '';
    if (selectedPeriod === 'week') return shiftDate(startDate, -7);
    if (selectedPeriod === 'month' || selectedPeriod === 'lastMonth') return shiftMonthClamped(startDate, -1);
    return shiftDate(startDate, -periodLength);
  });
  let prevEnd = $derived.by(() => {
    if (!endDate) return '';
    if (selectedPeriod === 'week') return shiftDate(endDate, -7);
    if (selectedPeriod === 'month' || selectedPeriod === 'lastMonth') {
      const d = parseYmd(endDate);
      const isMonthEnd = d.getDate() === new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      // 말일까지 꽉 찬 구간(지난 달 전체, 또는 오늘이 말일인 이번 달)은 지난달 말일이 정확히
      // "이번 구간 시작일 하루 전"이므로 그걸 쓴다 — shiftMonthClamped는 6/30→5/30처럼
      // 짧은 달에서 넘어올 때 진짜 말일(5/31)을 놓친다.
      return isMonthEnd ? shiftDate(startDate, -1) : shiftMonthClamped(endDate, -1);
    }
    return shiftDate(startDate, -1);
  });

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
    <div class="report-title">
      <h1 class="page-title">대시보드</h1>
      <div class="period-filter">
        <div class="chip-scroll" role="group" aria-label="기간">
          {#each PERIODS as p}
            <button class="chip" class:active={selectedPeriod === p.key} onclick={() => updateRange(p.key)}>
              {p.label}
            </button>
          {/each}
        </div>
        {#if selectedPeriod === 'custom'}
          <div class="custom-range">
            <input type="date" class="input-field input-sm" bind:value={startDate} aria-label="시작일" />
            <span class="range-separator">~</span>
            <input type="date" class="input-field input-sm" bind:value={endDate} aria-label="종료일" />
          </div>
        {:else}
          <p class="range-display">{formatDateDisplay(startDate)} ~ {formatDateDisplay(endDate)}</p>
        {/if}
      </div>
    </div>
    <div class="report-actions">
      <a href="/purchase" class="btn btn-secondary"><Icon name="bag" size={18} /> 매입 입력</a>
      <a href="/input" class="btn btn-primary"><Icon name="plus" size={18} stroke={2.4} /> 매출 입력</a>
    </div>
  </header>

  {#if loading}
    <div class="kpi-row kpi-row-3">
      {#each [0, 1, 2] as _}<div class="skeleton" style="height: 132px"></div>{/each}
    </div>
    <div class="skeleton" style="height: 340px"></div>
  {:else}
    <section class="kpi-section" aria-label="핵심 지표">
      <div class="kpi-row kpi-row-3">
        <KpiCard label="매출" value={currentPeriod.sales} format="currency" deltaPercent={salesGrowth} deltaLabel="이전 기간 대비" />
        <KpiCard label="순수익" value={currentPeriod.netProfit} format="currency" tone="auto" deltaPercent={profitGrowth} deltaLabel="이전 기간 대비" />
        <KpiCard label="처리 건수" value={currentPeriod.count} format="count" deltaPercent={countGrowth} deltaLabel="이전 기간 대비" />
      </div>
      <div class="kpi-row kpi-row-4">
        <KpiCard size="sm" label="판매마진" value={currentPeriod.salesMargin} format="percent" deltaPercent={salesMarginDelta} deltaUnit="%p" deltaLabel="이전 대비" />
        <KpiCard size="sm" label="운영마진" value={currentPeriod.margin} format="percent" deltaPercent={opMarginDelta} deltaUnit="%p" deltaLabel="이전 대비" />
        <KpiCard
          size="sm"
          label="ROAS"
          value={(currentPeriod.roas ?? 0) * 100}
          unavailable={currentPeriod.roas === null}
          format="percent"
          deltaPercent={roasGrowth}
          deltaLabel="이전 대비"
        />
        <KpiCard size="sm" label="광고비 비중" value={currentPeriod.adSpendRatio} format="percent" deltaPercent={adSpendRatioDelta} deltaUnit="%p" deltaLabel="이전 대비" invertDelta />
      </div>
    </section>

    <section class="report-section card">
      <div class="report-section-head">
        <h2 class="section-title">월별 성장 추이</h2>
        <span class="section-hint">최근 {monthlyBuckets.length}개월</span>
      </div>
      <TrendChart data={monthlyBuckets.map((b) => ({ label: b.label, sales: b.sales, netProfit: b.netProfit, adSpend: b.adSpend }))} />
    </section>

    <div class="report-row">
      <section class="report-section card">
        <div class="report-section-head">
          <h2 class="section-title">일별 매출 추이</h2>
          <span class="section-hint">선택 기간</span>
        </div>
        <Sparkline data={dailySales} startDate={startDate} label="선택 기간 일별 매출 추이" height={140} />
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
          <ShareBars items={supplierBreakdown} color="var(--chart-purchase)" />
        {/if}
      </section>

      <section class="report-section card">
        <h2 class="section-title">카테고리별 매입 비중</h2>
        {#if categoryBreakdown.length === 0}
          <p class="empty-hint">매입 기록이 없습니다</p>
        {:else}
          <ShareBars items={categoryBreakdown} color="var(--chart-purchase)" />
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
  .report-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .report-title {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .period-filter {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .range-display {
    font-size: var(--text-sm);
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

  .report-actions {
    display: flex;
    gap: var(--space-3);
  }

  .kpi-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .kpi-row {
    display: grid;
    gap: var(--space-3);
  }
  .kpi-row-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .kpi-row-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

  .report-row {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: var(--space-3);
  }

  .report-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    min-width: 0;
  }

  .report-section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .section-hint {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .empty-hint {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  @media (max-width: 1240px) {
    .report-row { grid-template-columns: 1fr; }
    .kpi-row-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
</style>

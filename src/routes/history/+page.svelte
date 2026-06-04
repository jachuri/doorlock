<script>
  import { onMount } from 'svelte';
  import { getServicesByDateRange, getPurchasesByDateRange } from '$lib/db.js';
  import { exportToExcel } from '$lib/excel.js';
  import {
    formatDate, formatDateDisplay, formatCurrency, formatPercent,
    getThisMonthRange, getThisWeekRange, getLastMonthRange
  } from '$lib/utils.js';

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
  let loading = $state(true);
  let exporting = $state(false);

  let services = $state([]);
  let purchases = $state([]);

  // 일별 집계
  let dailySummaries = $derived.by(() => {
    /** @type {Map<string, { sales: number, parts: number, purchase: number, count: number, services: Array }>} */
    const map = new Map();

    for (const s of services) {
      if (!map.has(s.date)) map.set(s.date, { sales: 0, parts: 0, purchase: 0, count: 0, services: [] });
      const d = map.get(s.date);
      d.sales += s.amount;
      d.parts += s.partsCost || 0;
      d.count += 1;
      d.services.push(s);
    }

    for (const p of purchases) {
      if (!map.has(p.date)) map.set(p.date, { sales: 0, parts: 0, purchase: 0, count: 0, services: [] });
      map.get(p.date).purchase += p.amount;
    }

    return [...map.entries()]
      .map(([date, data]) => ({
        date,
        ...data,
        netProfit: data.sales - data.parts - data.purchase,
        margin: data.sales > 0 ? ((data.sales - data.parts - data.purchase) / data.sales) * 100 : 0
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  });

  // 전체 집계
  let totalSales = $derived(services.reduce((s, r) => s + r.amount, 0));
  let totalParts = $derived(services.reduce((s, r) => s + (r.partsCost || 0), 0));
  let totalPurchase = $derived(purchases.reduce((s, r) => s + r.amount, 0));
  let totalNetProfit = $derived(totalSales - totalParts - totalPurchase);
  let totalMargin = $derived(totalSales > 0 ? (totalNetProfit / totalSales) * 100 : 0);

  // 펼치기 상태
  let expandedDate = $state('');

  onMount(() => {
    updateRange('month');
  });

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
        // 날짜 선택은 별도 input으로
        break;
    }

    if (period !== 'custom') loadData();
  }

  async function loadData() {
    loading = true;
    [services, purchases] = await Promise.all([
      getServicesByDateRange(startDate, endDate),
      getPurchasesByDateRange(startDate, endDate)
    ]);
    loading = false;
  }

  function onCustomDateChange() {
    if (startDate && endDate) {
      loadData();
    }
  }

  function toggleExpand(date) {
    expandedDate = expandedDate === date ? '' : date;
  }

  async function handleExport() {
    if (services.length === 0 && purchases.length === 0) return;
    exporting = true;
    try {
      await exportToExcel(services, purchases, startDate, endDate);
    } catch (err) {
      alert('엑셀 내보내기 실패: ' + err.message);
    } finally {
      exporting = false;
    }
  }
</script>

<svelte:head>
  <title>내역 조회 — 도어락 장부</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1>내역 조회</h1>
    <button
      class="btn btn-ghost"
      onclick={handleExport}
      disabled={exporting || (services.length === 0 && purchases.length === 0)}
    >
      {exporting ? '내보내는 중...' : '엑셀'}
    </button>
  </header>

  <!-- 기간 필터 -->
  <div class="filter-bar">
    <div class="chip-group">
      {#each PERIODS as p}
        <button
          class="chip"
          class:active={selectedPeriod === p.key}
          onclick={() => updateRange(p.key)}
        >
          {p.label}
        </button>
      {/each}
    </div>

    {#if selectedPeriod === 'custom'}
      <div class="custom-range">
        <input type="date" class="input-field input-sm" bind:value={startDate} onchange={onCustomDateChange} />
        <span class="range-separator">~</span>
        <input type="date" class="input-field input-sm" bind:value={endDate} onchange={onCustomDateChange} />
      </div>
    {:else}
      <p class="range-display">{formatDateDisplay(startDate)} ~ {formatDateDisplay(endDate)}</p>
    {/if}
  </div>

  {#if loading}
    <div class="loading"><div class="loading-dot"></div></div>
  {:else if dailySummaries.length === 0}
    <div class="empty-state">
      <p>선택한 기간에 데이터가 없습니다</p>
    </div>
  {:else}
    <!-- 일별 리스트 -->
    <ul class="daily-list">
      {#each dailySummaries as day}
        <li class="daily-item">
          <button class="daily-header" onclick={() => toggleExpand(day.date)}>
            <div class="daily-left">
              <span class="daily-date">{formatDateDisplay(day.date)}</span>
              <span class="daily-meta">{day.count}건</span>
            </div>
            <div class="daily-right">
              <span class="daily-sales">{formatCurrency(day.sales)}</span>
              <span class="daily-profit" class:positive={day.netProfit >= 0} class:negative={day.netProfit < 0}>
                {formatCurrency(day.netProfit)}
              </span>
            </div>
            <svg class="expand-icon" class:expanded={expandedDate === day.date} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          {#if expandedDate === day.date}
            <div class="daily-detail">
              {#each day.services as s}
                <div class="detail-row">
                  <span class="detail-time">{s.time || '--:--'}</span>
                  <span class="detail-method">{s.paymentMethod}</span>
                  <span class="detail-memo">{s.memo || ''}</span>
                  <span class="detail-amount font-mono">{formatCurrency(s.amount)}</span>
                </div>
              {/each}
              {#if day.purchase > 0}
                <div class="detail-row purchase-row">
                  <span class="detail-time">매입</span>
                  <span></span>
                  <span></span>
                  <span class="detail-amount font-mono text-negative">-{formatCurrency(day.purchase)}</span>
                </div>
              {/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <!-- 하단 요약 -->
  {#if !loading && dailySummaries.length > 0}
    <footer class="summary-footer">
      <div class="summary-grid">
        <div class="summary-cell">
          <span class="metric-label">총매출</span>
          <span class="metric-value-sm font-mono">{formatCurrency(totalSales)}</span>
        </div>
        <div class="summary-cell">
          <span class="metric-label">총지출</span>
          <span class="metric-value-sm font-mono">{formatCurrency(totalParts + totalPurchase)}</span>
        </div>
        <div class="summary-cell">
          <span class="metric-label">순수익</span>
          <span class="metric-value-sm font-mono" class:positive={totalNetProfit >= 0} class:negative={totalNetProfit < 0}>
            {formatCurrency(totalNetProfit)}
          </span>
        </div>
        <div class="summary-cell">
          <span class="metric-label">마진</span>
          <span class="metric-value-sm font-mono">{formatPercent(totalMargin)}</span>
        </div>
      </div>
    </footer>
  {/if}
</div>

<style>
  .page {
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    padding-bottom: calc(var(--space-12) + 80px);
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: var(--space-2);
  }
  .page-header h1 {
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    letter-spacing: -0.02em;
  }

  .filter-bar {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
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

  /* 일별 리스트 */
  .daily-list {
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  .daily-item {
    border-bottom: 1px solid var(--border-subtle);
  }
  .daily-item:last-child { border-bottom: none; }

  .daily-header {
    display: flex;
    align-items: center;
    width: 100%;
    padding: var(--space-4) 0;
    background: none;
    border: none;
    color: inherit;
    font-family: inherit;
    cursor: pointer;
    gap: var(--space-3);
    text-align: left;
  }

  .daily-left {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-width: 0;
  }

  .daily-date {
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
  }

  .daily-meta {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .daily-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    flex-shrink: 0;
  }

  .daily-sales {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
  }

  .daily-profit {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .positive { color: var(--positive); }
  .negative { color: var(--negative); }

  .expand-icon {
    flex-shrink: 0;
    color: var(--text-tertiary);
    transition: transform var(--duration-fast) var(--ease-out);
  }
  .expand-icon.expanded {
    transform: rotate(180deg);
  }

  /* 상세 내역 */
  .daily-detail {
    padding: 0 0 var(--space-4) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    animation: slide-in var(--duration-fast) var(--ease-out);
  }

  @keyframes slide-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .detail-row {
    display: grid;
    grid-template-columns: 48px 56px 1fr auto;
    gap: var(--space-2);
    align-items: center;
    font-size: var(--text-xs);
    color: var(--text-secondary);
    padding: var(--space-1) 0;
  }

  .detail-time {
    color: var(--text-tertiary);
    font-family: var(--font-mono);
  }

  .detail-method {
    color: var(--accent-text);
    font-weight: var(--weight-medium);
  }

  .detail-memo {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-tertiary);
  }

  .detail-amount {
    text-align: right;
    font-weight: var(--weight-medium);
  }

  .purchase-row {
    border-top: 1px dashed var(--border-subtle);
    padding-top: var(--space-2);
    margin-top: var(--space-1);
  }

  /* 하단 요약 */
  .summary-footer {
    position: fixed;
    bottom: var(--nav-height);
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: var(--max-width);
    background: var(--bg-raised);
    border-top: 1px solid var(--border-subtle);
    padding: var(--space-4) var(--space-5);
    z-index: 40;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-2);
    text-align: center;
  }

  .summary-cell {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .metric-value-sm {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    letter-spacing: -0.02em;
  }

  /* 로딩/빈 */
  .loading {
    display: flex;
    justify-content: center;
    padding: var(--space-12);
  }
  .loading-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--text-tertiary);
    animation: pulse 1s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1); }
  }

  input[type="date"] { color-scheme: dark; }
</style>

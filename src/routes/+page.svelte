<script>
  import { afterNavigate } from '$app/navigation';
  import { getServicesByDate, getServicesByDateRange, getPurchasesByDateRange } from '$lib/db.js';
  import { formatDate, formatDateDisplay, formatCurrency, formatPercent, formatMonth } from '$lib/utils.js';

  let today = formatDate();
  let selectedDate = $state(today);
  let currentMonth = $state({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });

  // 일별 데이터
  let dailyServices = $state([]);
  let dailyPurchases = $state([]);

  // 월별 데이터
  let monthlyServices = $state([]);
  let monthlyPurchases = $state([]);

  // 최근 기록
  let recentServices = $state([]);

  let loading = $state(true);

  // 일별 집계
  let dailyTotalSales = $derived(dailyServices.reduce((s, r) => s + r.amount, 0));
  let dailyTotalParts = $derived(dailyServices.reduce((s, r) => s + (r.partsCost || 0), 0));
  let dailyTotalPurchase = $derived(dailyPurchases.reduce((s, r) => s + r.amount, 0));
  let dailyNetProfit = $derived(dailyTotalSales - dailyTotalParts - dailyTotalPurchase);
  let dailyCount = $derived(dailyServices.length);

  // 월별 집계
  let monthlyTotalSales = $derived(monthlyServices.reduce((s, r) => s + r.amount, 0));
  let monthlyTotalParts = $derived(monthlyServices.reduce((s, r) => s + (r.partsCost || 0), 0));
  let monthlyTotalPurchase = $derived(monthlyPurchases.reduce((s, r) => s + r.amount, 0));
  let monthlyNetProfit = $derived(monthlyTotalSales - monthlyTotalParts - monthlyTotalPurchase);
  let monthlyMargin = $derived(monthlyTotalSales > 0 ? (monthlyNetProfit / monthlyTotalSales) * 100 : 0);
  let monthlyCount = $derived(monthlyServices.length);

  afterNavigate(() => {
    loadData();
  });

  async function loadData() {
    loading = true;
    await Promise.all([loadDaily(), loadMonthly(), loadRecent()]);
    loading = false;
  }

  async function loadDaily() {
    dailyServices = await getServicesByDate(selectedDate);
    const dayPurchases = await getPurchasesByDateRange(selectedDate, selectedDate);
    dailyPurchases = dayPurchases;
  }

  async function loadMonthly() {
    const y = currentMonth.year;
    const m = currentMonth.month;
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    monthlyServices = await getServicesByDateRange(start, end);
    monthlyPurchases = await getPurchasesByDateRange(start, end);
  }

  async function loadRecent() {
    const end = formatDate();
    const startD = new Date();
    startD.setDate(startD.getDate() - 6);
    const start = formatDate(startD);
    const all = await getServicesByDateRange(start, end);
    recentServices = all.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.time || '').localeCompare(a.time || '');
    }).slice(0, 8);
  }

  function prevDay() {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    selectedDate = formatDate(d);
    loadDaily();
  }

  function nextDay() {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    if (d <= new Date()) {
      selectedDate = formatDate(d);
      loadDaily();
    }
  }

  function prevMonth() {
    let { year, month } = currentMonth;
    month -= 1;
    if (month < 1) { month = 12; year -= 1; }
    currentMonth = { year, month };
    loadMonthly();
  }

  function nextMonth() {
    let { year, month } = currentMonth;
    const now = new Date();
    const currentM = now.getFullYear() * 12 + now.getMonth() + 1;
    const targetM = year * 12 + month + 1;
    if (targetM <= currentM) {
      month += 1;
      if (month > 12) { month = 1; year += 1; }
      currentMonth = { year, month };
      loadMonthly();
    }
  }
</script>

<svelte:head>
  <title>도어락 장부</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1>도어락 장부</h1>
    <span class="header-date">{formatDateDisplay(today)}</span>
  </header>

  {#if loading}
    <div class="loading">
      <div class="loading-dot"></div>
    </div>
  {:else}
    <!-- 일별 요약 -->
    <section class="section" aria-label="일별 요약">
      <div class="section-title-row">
        <h2 class="section-title">일별 요약</h2>
        <div class="date-nav">
          <button class="btn-icon" onclick={prevDay} aria-label="전일">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="date-label">{formatDateDisplay(selectedDate)}</span>
          <button class="btn-icon" onclick={nextDay} aria-label="익일">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="card metric">
          <span class="metric-label">매출</span>
          <span class="metric-value">{formatCurrency(dailyTotalSales)}</span>
        </div>
        <div class="card metric">
          <span class="metric-label">건수</span>
          <span class="metric-value">{dailyCount}건</span>
        </div>
        <div class="card metric">
          <span class="metric-label">매입+부품비</span>
          <span class="metric-value">{formatCurrency(dailyTotalPurchase + dailyTotalParts)}</span>
        </div>
        <div class="card metric">
          <span class="metric-label">순수익</span>
          <span class="metric-value" class:positive={dailyNetProfit >= 0} class:negative={dailyNetProfit < 0}>
            {formatCurrency(dailyNetProfit)}
          </span>
        </div>
      </div>
    </section>

    <!-- 월간 요약 -->
    <section class="section" aria-label="월간 요약">
      <div class="section-title-row">
        <h2 class="section-title">월간 요약</h2>
        <div class="date-nav">
          <button class="btn-icon" onclick={prevMonth} aria-label="전월">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="date-label">{formatMonth(currentMonth.year, currentMonth.month)}</span>
          <button class="btn-icon" onclick={nextMonth} aria-label="익월">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <div class="metrics-row">
        <div class="metric-inline">
          <span class="metric-label">매출</span>
          <span class="metric-value-sm">{formatCurrency(monthlyTotalSales)}</span>
        </div>
        <div class="metric-inline">
          <span class="metric-label">건수</span>
          <span class="metric-value-sm">{monthlyCount}건</span>
        </div>
        <div class="metric-inline">
          <span class="metric-label">순수익</span>
          <span class="metric-value-sm" class:positive={monthlyNetProfit >= 0} class:negative={monthlyNetProfit < 0}>
            {formatCurrency(monthlyNetProfit)}
          </span>
        </div>
        <div class="metric-inline">
          <span class="metric-label">마진</span>
          <span class="metric-value-sm">{formatPercent(monthlyMargin)}</span>
        </div>
      </div>
    </section>

    <!-- 최근 기록 -->
    <section class="section" aria-label="최근 기록">
      <div class="section-title-row">
        <h2 class="section-title">최근 기록</h2>
        {#if recentServices.length > 0}
          <a href="/history" class="link-more">전체보기 · 수정/삭제</a>
        {/if}
      </div>

      {#if recentServices.length === 0}
        <div class="empty-state">
          <p>아직 기록이 없습니다</p>
          <a href="/input" class="btn btn-primary">첫 매출 입력하기</a>
        </div>
      {:else}
        <ul class="record-list">
          {#each recentServices as service}
            <li class="record-item">
              <div class="record-left">
                <span class="record-date">{formatDateDisplay(service.date)}</span>
                <span class="record-meta">
                  {service.time || ''} · {service.paymentMethod}
                  {#if service.memo}
                    · {service.memo}
                  {/if}
                </span>
              </div>
              <div class="record-right">
                <span class="record-amount">{formatCurrency(service.amount)}</span>
                {#if service.partsCost > 0}
                  <span class="record-parts">-{formatCurrency(service.partsCost)}</span>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
</div>

<style>
  .page {
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .page-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-top: var(--space-2);
  }

  .page-header h1 {
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    letter-spacing: -0.02em;
  }

  .header-date {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .section-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-title {
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    color: var(--text-secondary);
    letter-spacing: -0.01em;
  }

  .date-nav {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .date-label {
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--text-primary);
    min-width: 100px;
    text-align: center;
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }
  .btn-icon:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  .metrics-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-2);
    background: var(--bg-raised);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }

  .metric-inline {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    text-align: center;
  }

  .metric-value-sm {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    letter-spacing: -0.02em;
  }

  .positive { color: var(--positive); }
  .negative { color: var(--negative); }

  .link-more {
    font-size: var(--text-xs);
    color: var(--accent-text);
    text-decoration: none;
    font-weight: var(--weight-medium);
  }
  .link-more:hover {
    text-decoration: underline;
  }

  /* 기록 리스트 */
  .record-list {
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  .record-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--border-subtle);
  }
  .record-item:last-child {
    border-bottom: none;
  }

  .record-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .record-date {
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
  }

  .record-meta {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .record-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    flex-shrink: 0;
  }

  .record-amount {
    font-family: var(--font-mono);
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    letter-spacing: -0.02em;
  }

  .record-parts {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  /* 로딩 */
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
</style>

<script>
  import { afterNavigate } from '$app/navigation';
  import { getServicesByDate, getServicesByDateRange, getPurchasesByDateRange } from '$lib/db.js';
  import { formatDate, formatDateDisplay, formatPercent, formatMonth } from '$lib/utils.js';
  import { viewport } from '$lib/viewport.svelte.js';
  import DesktopDashboard from '$lib/components/DesktopDashboard.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import Money from '$lib/components/Money.svelte';

  let today = formatDate();
  let selectedDate = $state(today);
  let currentMonth = $state({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });

  // 일별 데이터
  let dailyServices = $state([]);
  let dailyPurchases = $state([]);

  // 월별 데이터
  let monthlyServices = $state([]);
  let monthlyPurchases = $state([]);
  // 전월 동기간 매출 (이번 달 진행 중일 때 비교용)
  let prevMonthSales = $state(/** @type {number | null} */ (null));

  // 최근 기록
  let recentServices = $state([]);

  let loading = $state(true);
  let dailyLoading = $state(false);
  let monthlyLoading = $state(false);

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
  let monthlySalesGrowth = $derived(
    prevMonthSales ? ((monthlyTotalSales - prevMonthSales) / prevMonthSales) * 100 : null
  );

  let isToday = $derived(selectedDate === today);
  let isCurrentMonth = $derived(
    currentMonth.year === new Date().getFullYear() && currentMonth.month === new Date().getMonth() + 1
  );

  afterNavigate(() => {
    // 데스크톱은 DesktopDashboard가 자체적으로 데이터를 불러오므로 여기서는 생략
    if (!viewport.isDesktop) loadData();
  });

  async function loadData() {
    loading = true;
    await Promise.all([loadDaily(), loadMonthly(), loadRecent()]);
    loading = false;
  }

  async function loadDaily() {
    dailyLoading = true;
    const [s, p] = await Promise.all([
      getServicesByDate(selectedDate),
      getPurchasesByDateRange(selectedDate, selectedDate),
    ]);
    dailyServices = s;
    dailyPurchases = p;
    dailyLoading = false;
  }

  async function loadMonthly() {
    monthlyLoading = true;
    const y = currentMonth.year;
    const m = currentMonth.month;
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // 진행 중인 달은 전월 같은 날짜까지, 지난 달은 전월 전체와 비교
    const now = new Date();
    const inProgress = y === now.getFullYear() && m === now.getMonth() + 1;
    const prevLast = new Date(y, m - 1, 0);
    const prevEndDay = inProgress ? Math.min(now.getDate(), prevLast.getDate()) : prevLast.getDate();
    const prevStart = formatDate(new Date(prevLast.getFullYear(), prevLast.getMonth(), 1));
    const prevEnd = formatDate(new Date(prevLast.getFullYear(), prevLast.getMonth(), prevEndDay));

    const [s, p, prev] = await Promise.all([
      getServicesByDateRange(start, end),
      getPurchasesByDateRange(start, end),
      getServicesByDateRange(prevStart, prevEnd),
    ]);
    monthlyServices = s;
    monthlyPurchases = p;
    prevMonthSales = prev.reduce((/** @type {number} */ sum, /** @type {{ amount: number }} */ r) => sum + r.amount, 0);
    monthlyLoading = false;
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

  /** @param {string} dateStr */
  function relativeDay(dateStr) {
    if (dateStr === today) return '오늘';
    const y = new Date();
    y.setDate(y.getDate() - 1);
    if (dateStr === formatDate(y)) return '어제';
    return formatDateDisplay(dateStr);
  }
</script>

<svelte:head>
  <title>도어락 장부</title>
</svelte:head>

{#if viewport.isDesktop}
  <DesktopDashboard />
{:else}
<div class="page">
  <header class="page-header">
    <div>
      <p class="eyebrow">{formatDateDisplay(today)}</p>
      <h1 class="page-title">도어락 장부</h1>
    </div>
  </header>

  {#if loading}
    <div class="skeleton" style="height: 214px"></div>
    <div class="skeleton" style="height: 196px"></div>
    <div class="skeleton" style="height: 260px"></div>
  {:else}
    <!-- 일별 요약: 순수익이 결론, 매출·지출·건수는 근거 -->
    <section class="hero card" aria-label="일별 요약" class:dim={dailyLoading}>
      <div class="card-head">
        <button class="btn-icon" onclick={prevDay} aria-label="전날">
          <Icon name="chevron-left" size={22} />
        </button>
        <div class="card-head-label">
          <span class="head-date">{formatDateDisplay(selectedDate)}</span>
          {#if isToday}<span class="today-pill">오늘</span>{/if}
        </div>
        <button class="btn-icon" onclick={nextDay} aria-label="다음날" disabled={isToday}>
          <Icon name="chevron-right" size={22} />
        </button>
      </div>

      <div class="hero-main">
        <span class="metric-label">순수익</span>
        <Money value={dailyNetProfit} tone="auto" class="hero-value" />
      </div>

      <dl class="stat-row">
        <div class="stat">
          <dt>매출</dt>
          <dd><Money value={dailyTotalSales} tone="sales" /></dd>
        </div>
        <div class="stat">
          <dt>매입+부품비</dt>
          <dd><Money value={dailyTotalPurchase + dailyTotalParts} tone="muted" /></dd>
        </div>
        <div class="stat stat-count">
          <dt>건수</dt>
          <dd><span class="num">{dailyCount}</span><span class="won">건</span></dd>
        </div>
      </dl>
    </section>

    <!-- 월간 요약 -->
    <section class="card month" aria-label="월간 요약" class:dim={monthlyLoading}>
      <div class="card-head">
        <button class="btn-icon" onclick={prevMonth} aria-label="전월">
          <Icon name="chevron-left" size={22} />
        </button>
        <div class="card-head-label">
          <span class="head-date">{formatMonth(currentMonth.year, currentMonth.month)}</span>
        </div>
        <button class="btn-icon" onclick={nextMonth} aria-label="익월" disabled={isCurrentMonth}>
          <Icon name="chevron-right" size={22} />
        </button>
      </div>

      <div class="month-main">
        <div>
          <span class="metric-label">월 순수익</span>
          <Money value={monthlyNetProfit} tone="auto" class="month-value" />
        </div>
        <div class="margin-badge" class:negative={monthlyMargin < 0}>
          <span class="metric-label">마진</span>
          <span class="num margin-value">{formatPercent(monthlyMargin)}</span>
        </div>
      </div>

      <dl class="stat-row">
        <div class="stat">
          <dt>매출</dt>
          <dd><Money value={monthlyTotalSales} tone="sales" /></dd>
        </div>
        <div class="stat">
          <dt>지출</dt>
          <dd><Money value={monthlyTotalPurchase + monthlyTotalParts} tone="muted" /></dd>
        </div>
        <div class="stat stat-count">
          <dt>건수</dt>
          <dd><span class="num">{monthlyCount}</span><span class="won">건</span></dd>
        </div>
      </dl>

      {#if monthlySalesGrowth !== null}
        <p class="growth" class:up={monthlySalesGrowth >= 0} class:down={monthlySalesGrowth < 0}>
          <Icon name={monthlySalesGrowth >= 0 ? 'arrow-up' : 'arrow-down'} size={14} stroke={2.4} />
          <span>
            {isCurrentMonth ? '지난달 같은 기간' : '지난달'} 대비 매출
            <strong class="num">{formatPercent(Math.abs(monthlySalesGrowth))}</strong>
            {monthlySalesGrowth >= 0 ? '증가' : '감소'}
          </span>
        </p>
      {/if}
    </section>

    <!-- 최근 기록 -->
    <section class="section" aria-label="최근 매출">
      <div class="section-head">
        <h2 class="section-title">최근 매출</h2>
        {#if recentServices.length > 0}
          <a href="/history" class="btn btn-ghost btn-sm link-more">
            전체보기 <Icon name="chevron-right" size={16} />
          </a>
        {/if}
      </div>

      {#if recentServices.length === 0}
        <div class="empty-state card">
          <span class="empty-icon"><Icon name="receipt" size={26} /></span>
          <p>최근 7일간 매출 기록이 없습니다</p>
          <a href="/input" class="btn btn-primary">첫 매출 입력하기</a>
        </div>
      {:else}
        <ul class="record-list card">
          {#each recentServices as service}
            <li class="record-item">
              <div class="record-left">
                <span class="record-title">
                  {relativeDay(service.date)}
                  <span class="record-time num">{service.time || ''}</span>
                </span>
                <span class="record-meta">
                  <span class="pay">{service.paymentMethod}</span>
                  {#if service.memo}<span class="memo">· {service.memo}</span>{/if}
                </span>
              </div>
              <Money value={service.amount} class="record-amount" />
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
</div>
{/if}

<style>
  .dim { opacity: 0.55; transition: opacity var(--duration-fast); }

  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: calc(var(--space-3) * -1) calc(var(--space-3) * -1) 0;
  }

  .card-head-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .head-date {
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
  }

  .today-pill {
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
    background: var(--brand-muted);
    color: var(--brand-text);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
  }

  .hero-main,
  .month-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-3) 0 var(--space-4);
  }

  .month-main {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-3);
  }
  .month-main > div:first-child {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .hero-main :global(.hero-value) {
    font-size: 2.375rem;
    font-weight: var(--weight-heavy);
    letter-spacing: -0.035em;
    line-height: 1.15;
  }

  .month-main :global(.month-value) {
    font-size: var(--text-2xl);
    font-weight: var(--weight-heavy);
    letter-spacing: -0.03em;
    line-height: 1.2;
  }

  .margin-badge {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    flex-shrink: 0;
  }
  .margin-value {
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
  }

  .stat-row {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1.25fr) minmax(0, 0.7fr);
    gap: var(--space-2);
    padding-top: var(--space-4);
    border-top: 1px solid var(--border-subtle);
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .stat dt {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    font-weight: var(--weight-medium);
  }
  .stat dd {
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .stat-count { text-align: right; }

  .growth {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-4);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    background: var(--bg-surface);
  }
  .growth.up :global(svg), .growth.up strong { color: var(--positive); }
  .growth.down :global(svg), .growth.down strong { color: var(--negative); }

  .link-more {
    gap: 2px;
    padding-right: var(--space-2);
    color: var(--accent-text);
  }

  /* 최근 기록 */
  .record-list {
    list-style: none;
    padding: 0 var(--space-4);
  }

  .record-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: 64px;
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--border-subtle);
  }
  .record-item:last-child { border-bottom: none; }

  .record-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .record-title {
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
  }
  .record-time {
    margin-left: var(--space-1);
    font-size: var(--text-sm);
    font-weight: var(--weight-normal);
    color: var(--text-tertiary);
  }

  .record-meta {
    display: flex;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--text-tertiary);
    min-width: 0;
  }
  .record-meta .pay { flex-shrink: 0; }
  .record-meta .memo {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .record-list :global(.record-amount) {
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    flex-shrink: 0;
  }
</style>

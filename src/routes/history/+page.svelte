<script>
  import { onMount } from 'svelte';
  import {
    getServicesByDateRange, getPurchasesByDateRange, updateService, deleteService,
    updatePurchase, deletePurchase, getSupplierList
  } from '$lib/db.js';
  import { exportToExcel } from '$lib/excel.js';
  import ShareBars from '$lib/components/charts/ShareBars.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import Money from '$lib/components/Money.svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import AmountInput from '$lib/components/AmountInput.svelte';
  import { toast, confirmDialog } from '$lib/ui.svelte.js';
  import {
    formatDate, formatDateDisplay, formatCurrency, formatPercent, formatNumber,
    parseAmount,
    getThisMonthRange, getThisWeekRange, getLastMonthRange
  } from '$lib/utils.js';

  const PERIODS = [
    { key: 'today', label: '오늘' },
    { key: 'week', label: '이번 주' },
    { key: 'month', label: '이번 달' },
    { key: 'lastMonth', label: '지난 달' },
    { key: 'custom', label: '직접선택' },
  ];

  const TYPE_FILTERS = [
    { key: 'all', label: '전체' },
    { key: 'service', label: '매출' },
    { key: 'purchase', label: '매입' },
  ];

  const PAYMENT_METHODS = ['현금', '카드', '계좌이체'];
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

  let viewMode = $state('list'); // 'list' | 'calendar'
  let typeFilter = $state('all'); // 'all' | 'service' | 'purchase' — 리스트 모드 전용

  let selectedPeriod = $state('month');
  let startDate = $state('');
  let endDate = $state('');
  let loading = $state(true);
  let exporting = $state(false);

  let services = $state([]);
  let purchases = $state([]);

  // 달력 모드 전용 상태 (기간 필터와 별개로 해당 월 전체 데이터를 불러옴)
  const today = new Date();
  const todayKey = formatDate(today);
  let calendarYear = $state(today.getFullYear());
  let calendarMonth = $state(today.getMonth() + 1); // 1~12
  let calendarServices = $state([]);
  let calendarPurchases = $state([]);
  let calendarLoading = $state(false);
  let calendarExpandedDate = $state('');

  // 수정 시트 ('service' | 'purchase' 공용)
  let showModal = $state(false);
  let editingRecord = $state(null);
  let recordType = $state('service');
  let formDate = $state('');
  let formTime = $state('');
  let formPaymentMethod = $state('카드');
  let formAmountStr = $state('');
  let formPartsCostStr = $state('');
  let formSupplier = $state('');
  let formMemo = $state('');
  let formSaving = $state(false);

  // 매입처 자동완성 (매입 수정용)
  let supplierList = $state([]);
  let showSuggestions = $state(false);
  let filteredSuppliers = $derived(
    formSupplier.length > 0
      ? supplierList.filter((s) => s.toLowerCase().includes(formSupplier.toLowerCase()) && s !== formSupplier)
      : []
  );

  /** 매출/매입 배열로 날짜별 집계 맵을 만든다 */
  function buildDailyMap(servicesArr, purchasesArr) {
    /** @type {Map<string, { sales: number, parts: number, purchase: number, count: number, services: Array, purchases: Array, netProfit: number, margin: number }>} */
    const map = new Map();

    for (const s of servicesArr) {
      if (!map.has(s.date)) map.set(s.date, { sales: 0, parts: 0, purchase: 0, count: 0, services: [], purchases: [] });
      const d = map.get(s.date);
      d.sales += s.amount;
      d.parts += s.partsCost || 0;
      d.count += 1;
      d.services.push(s);
    }

    for (const p of purchasesArr) {
      if (!map.has(p.date)) map.set(p.date, { sales: 0, parts: 0, purchase: 0, count: 0, services: [], purchases: [] });
      const d = map.get(p.date);
      d.purchase += p.amount;
      d.purchases.push(p);
    }

    for (const data of map.values()) {
      data.netProfit = data.sales - data.parts - data.purchase;
      data.margin = data.sales > 0 ? (data.netProfit / data.sales) * 100 : 0;
    }

    return map;
  }

  // 일별 집계 (리스트 모드)
  let dailySummaries = $derived.by(() => {
    const map = buildDailyMap(services, purchases);
    return [...map.entries()]
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));
  });

  // 유형 필터 적용 (리스트 모드 전용) — 매출/매입 중 하나만 볼 때는 해당 항목이 없는 날은 제외
  let filteredDailySummaries = $derived.by(() => {
    if (typeFilter === 'service') return dailySummaries.filter((d) => d.services.length > 0);
    if (typeFilter === 'purchase') return dailySummaries.filter((d) => d.purchases.length > 0);
    return dailySummaries;
  });

  // 선택 기간 매입처별/카테고리별 지출 (매입 필터 전용)
  let periodSupplierBreakdown = $derived.by(() => {
    const map = new Map();
    for (const p of purchases) {
      const key = p.supplier || '기타';
      map.set(key, (map.get(key) || 0) + p.amount);
    }
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  });

  let periodCategoryBreakdown = $derived.by(() => {
    const map = new Map();
    for (const p of purchases) {
      const key = p.category || '기타';
      map.set(key, (map.get(key) || 0) + p.amount);
    }
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  });

  // 전체 집계 (리스트 모드)
  let totalSales = $derived(services.reduce((s, r) => s + r.amount, 0));
  let totalParts = $derived(services.reduce((s, r) => s + (r.partsCost || 0), 0));
  let totalPurchase = $derived(purchases.reduce((s, r) => s + r.amount, 0));
  let totalNetProfit = $derived(totalSales - totalParts - totalPurchase);
  let totalMargin = $derived(totalSales > 0 ? (totalNetProfit / totalSales) * 100 : 0);

  // 일별 집계 (달력 모드 — 선택한 월 전체)
  let calendarDailyMap = $derived.by(() => buildDailyMap(calendarServices, calendarPurchases));

  // 전체 집계 (달력 모드)
  let calendarTotalSales = $derived(calendarServices.reduce((s, r) => s + r.amount, 0));
  let calendarTotalParts = $derived(calendarServices.reduce((s, r) => s + (r.partsCost || 0), 0));
  let calendarTotalPurchase = $derived(calendarPurchases.reduce((s, r) => s + r.amount, 0));
  let calendarTotalNetProfit = $derived(calendarTotalSales - calendarTotalParts - calendarTotalPurchase);
  let calendarTotalMargin = $derived(calendarTotalSales > 0 ? (calendarTotalNetProfit / calendarTotalSales) * 100 : 0);

  // 달력 그리드
  let calendarDaysInMonth = $derived(new Date(calendarYear, calendarMonth, 0).getDate());
  let calendarFirstWeekday = $derived(new Date(calendarYear, calendarMonth - 1, 1).getDay());
  let calendarCells = $derived.by(() => {
    const cells = [];
    for (let i = 0; i < calendarFirstWeekday; i++) cells.push(null);
    for (let d = 1; d <= calendarDaysInMonth; d++) {
      const dateKey = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateKey, weekday: new Date(calendarYear, calendarMonth - 1, d).getDay() });
    }
    return cells;
  });
  let isCalendarCurrentMonth = $derived(
    calendarYear === today.getFullYear() && calendarMonth === today.getMonth() + 1
  );

  // 하단 요약 (보기 모드에 따라)
  let summary = $derived(
    viewMode === 'calendar'
      ? { sales: calendarTotalSales, cost: calendarTotalParts + calendarTotalPurchase, net: calendarTotalNetProfit, margin: calendarTotalMargin }
      : { sales: totalSales, cost: totalParts + totalPurchase, net: totalNetProfit, margin: totalMargin }
  );
  let showSummary = $derived(viewMode === 'calendar' ? !calendarLoading : !loading && dailySummaries.length > 0);

  // 펼치기 상태 (리스트 모드 — 여러 날짜 동시에 펼칠 수 있음)
  let expandedDates = $state(/** @type {Set<string>} */ (new Set()));
  let allExpanded = $derived(
    filteredDailySummaries.length > 0 && filteredDailySummaries.every((d) => expandedDates.has(d.date))
  );

  onMount(() => {
    updateRange('month');
    loadSupplierList();
  });

  async function loadSupplierList() {
    supplierList = await getSupplierList();
  }

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

  /** @param {string} date */
  function toggleExpand(date) {
    const next = new Set(expandedDates);
    if (next.has(date)) next.delete(date);
    else next.add(date);
    expandedDates = next;
  }

  function toggleExpandAll() {
    expandedDates = allExpanded ? new Set() : new Set(filteredDailySummaries.map((d) => d.date));
  }

  function toggleCalendarExpand(date) {
    calendarExpandedDate = calendarExpandedDate === date ? '' : date;
  }

  /** 리스트 ↔ 달력 전환. 달력으로 전환 시 현재 보고 있던 기간(종료일)이 속한 월을 자동으로 연다 */
  function toggleViewMode() {
    if (viewMode === 'list') {
      const base = endDate ? new Date(endDate + 'T00:00:00') : new Date();
      calendarYear = base.getFullYear();
      calendarMonth = base.getMonth() + 1;
      viewMode = 'calendar';
      calendarExpandedDate = '';
      loadCalendarData();
    } else {
      viewMode = 'list';
    }
  }

  async function loadCalendarData() {
    calendarLoading = true;
    const mm = String(calendarMonth).padStart(2, '0');
    const start = `${calendarYear}-${mm}-01`;
    const lastDay = new Date(calendarYear, calendarMonth, 0).getDate();
    const end = `${calendarYear}-${mm}-${String(lastDay).padStart(2, '0')}`;
    [calendarServices, calendarPurchases] = await Promise.all([
      getServicesByDateRange(start, end),
      getPurchasesByDateRange(start, end)
    ]);
    calendarLoading = false;
  }

  function goToPrevMonth() {
    calendarMonth -= 1;
    if (calendarMonth < 1) {
      calendarMonth = 12;
      calendarYear -= 1;
    }
    calendarExpandedDate = '';
    loadCalendarData();
  }

  function goToNextMonth() {
    if (isCalendarCurrentMonth) return;
    calendarMonth += 1;
    if (calendarMonth > 12) {
      calendarMonth = 1;
      calendarYear += 1;
    }
    calendarExpandedDate = '';
    loadCalendarData();
  }

  async function handleExport() {
    if (services.length === 0 && purchases.length === 0) return;
    exporting = true;
    try {
      await exportToExcel(services, purchases, startDate, endDate);
    } catch (err) {
      toast.show('엑셀 내보내기 실패: ' + err.message, 'error');
    } finally {
      exporting = false;
    }
  }

  // ─── 수정/삭제 ───

  /**
   * @param {*} record
   * @param {'service' | 'purchase'} type
   */
  function openEditModal(record, type = 'service') {
    editingRecord = record;
    recordType = type;
    formDate = record.date;
    formAmountStr = record.amount > 0 ? record.amount.toLocaleString('ko-KR') : '';
    formMemo = record.memo || '';
    if (type === 'purchase') {
      formSupplier = record.supplier || '';
    } else {
      formTime = record.time || '';
      formPaymentMethod = record.paymentMethod || '카드';
      formPartsCostStr = record.partsCost > 0 ? record.partsCost.toLocaleString('ko-KR') : '';
    }
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingRecord = null;
    showSuggestions = false;
  }

  /** @param {string} name */
  function selectSupplier(name) {
    formSupplier = name;
    showSuggestions = false;
  }

  async function reloadCurrentView() {
    await (viewMode === 'calendar' ? loadCalendarData() : loadData());
  }

  async function handleSave() {
    const amount = parseAmount(formAmountStr);

    if (recordType === 'purchase') {
      if (!formSupplier.trim()) {
        toast.show('매입처를 입력해주세요', 'error');
        return;
      }
      if (amount <= 0) {
        toast.show('금액을 입력해주세요', 'error');
        return;
      }

      formSaving = true;
      try {
        await updatePurchase({
          ...editingRecord,
          date: formDate,
          supplier: formSupplier.trim(),
          amount,
          memo: formMemo.trim() || ''
        });

        toast.show('수정 완료');
        closeModal();
        await reloadCurrentView();
        await loadSupplierList();
      } catch {
        toast.show('수정에 실패했습니다', 'error');
      } finally {
        formSaving = false;
      }
      return;
    }

    if (amount <= 0) {
      toast.show('매출액을 입력해주세요', 'error');
      return;
    }

    formSaving = true;
    try {
      await updateService({
        ...editingRecord,
        date: formDate,
        time: formTime,
        paymentMethod: formPaymentMethod,
        amount,
        partsCost: parseAmount(formPartsCostStr) || 0,
        memo: formMemo.trim() || ''
      });

      toast.show('수정 완료');
      closeModal();
      await reloadCurrentView();
    } catch {
      toast.show('수정에 실패했습니다', 'error');
    } finally {
      formSaving = false;
    }
  }

  async function handleDelete() {
    if (!editingRecord) return;
    const record = editingRecord;
    const isPurchase = recordType === 'purchase';

    const ok = await confirmDialog.ask({
      title: isPurchase ? '매입 기록 삭제' : '매출 기록 삭제',
      message: isPurchase
        ? `${formatDateDisplay(record.date)} · ${record.supplier}\n${formatCurrency(record.amount)}\n\n삭제하면 되돌릴 수 없습니다.`
        : `${formatDateDisplay(record.date)} ${record.time || ''} · ${record.paymentMethod}\n${formatCurrency(record.amount)}\n\n삭제하면 되돌릴 수 없습니다.`,
      confirmLabel: '삭제',
      danger: true,
    });
    if (!ok) return;

    try {
      if (isPurchase) await deletePurchase(record.id);
      else await deleteService(record.id);
      toast.show('삭제 완료');
      closeModal();
      await reloadCurrentView();
    } catch {
      toast.show('삭제에 실패했습니다', 'error');
    }
  }
</script>

<svelte:head>
  <title>내역 조회 — 도어락 장부</title>
</svelte:head>

{#snippet detailRows(/** @type {any} */ day, /** @type {boolean} */ showServices, /** @type {boolean} */ showPurchases)}
  <div class="daily-detail">
    {#if showServices}
      {#each day.services as s}
        <button class="detail-row" onclick={() => openEditModal(s)}>
          <span class="detail-time num">{s.time || '--:--'}</span>
          <span class="detail-main">
            <span class="detail-title">{s.paymentMethod}</span>
            {#if s.memo}<span class="detail-memo">{s.memo}</span>{/if}
          </span>
          <Money value={s.amount} class="detail-amount" />
          <Icon name="chevron-right" size={16} class="detail-chevron" />
        </button>
      {/each}
    {/if}
    {#if showPurchases}
      {#each day.purchases as p, i}
        <button
          class="detail-row"
          class:first-purchase={i === 0 && showServices && day.services.length > 0}
          onclick={() => openEditModal(p, 'purchase')}
        >
          <span class="detail-time"><span class="badge-purchase">매입</span></span>
          <span class="detail-main">
            <span class="detail-title">{p.supplier}</span>
            {#if p.memo}<span class="detail-memo">{p.memo}</span>{/if}
          </span>
          <Money value={-p.amount} class="detail-amount purchase-amount" />
          <Icon name="chevron-right" size={16} class="detail-chevron" />
        </button>
      {/each}
    {/if}
  </div>
{/snippet}

<div class="page history-page">
  <header class="page-header">
    <h1 class="page-title">내역</h1>
    <div class="header-actions">
      <div class="segmented" role="group" aria-label="보기 방식">
        <button aria-pressed={viewMode === 'list'} data-test="view-list" onclick={() => viewMode === 'calendar' && toggleViewMode()}>
          리스트
        </button>
        <button aria-pressed={viewMode === 'calendar'} data-test="view-calendar" onclick={() => viewMode === 'list' && toggleViewMode()}>
          달력
        </button>
      </div>
      <button
        class="btn-icon export-btn"
        onclick={handleExport}
        disabled={exporting || (services.length === 0 && purchases.length === 0)}
        aria-label="엑셀로 내보내기"
        title="엑셀로 내보내기"
      >
        <Icon name="sheet" size={21} />
      </button>
    </div>
  </header>

  {#if viewMode === 'list'}
    <!-- 기간 필터 -->
    <div class="filter-bar">
      <div class="chip-scroll" role="group" aria-label="기간">
        {#each PERIODS as p}
          <button class="chip" class:active={selectedPeriod === p.key} onclick={() => updateRange(p.key)}>
            {p.label}
          </button>
        {/each}
      </div>

      {#if selectedPeriod === 'custom'}
        <div class="custom-range">
          <input type="date" class="input-field input-sm" bind:value={startDate} onchange={onCustomDateChange} aria-label="시작일" />
          <span class="range-separator">~</span>
          <input type="date" class="input-field input-sm" bind:value={endDate} onchange={onCustomDateChange} aria-label="종료일" />
        </div>
      {/if}

      <div class="filter-row">
        <div class="segmented" role="group" aria-label="유형">
          {#each TYPE_FILTERS as t}
            <button aria-pressed={typeFilter === t.key} data-test="type-{t.key}" onclick={() => (typeFilter = t.key)}>
              {t.label}
            </button>
          {/each}
        </div>
        {#if selectedPeriod !== 'custom' && startDate}
          <span class="range-display">
            {startDate === endDate ? formatDateDisplay(startDate) : `${startDate.slice(5).replace('-', '.')} ~ ${endDate.slice(5).replace('-', '.')}`}
          </span>
        {/if}
      </div>
    </div>

    {#if loading}
      <div class="list-skeleton">
        {#each [0, 1, 2, 3] as _}
          <div class="skeleton" style="height: 76px"></div>
        {/each}
      </div>
    {:else}
      {#if typeFilter === 'purchase' && purchases.length > 0}
        <div class="breakdown-row">
          <section class="breakdown-section card">
            <h2 class="section-title">매입처별 지출</h2>
            <ShareBars items={periodSupplierBreakdown} color="var(--chart-purchase)" />
          </section>
          <section class="breakdown-section card">
            <h2 class="section-title">카테고리별 지출</h2>
            <ShareBars items={periodCategoryBreakdown} color="var(--chart-purchase)" />
          </section>
        </div>
      {/if}

      {#if filteredDailySummaries.length === 0}
        <div class="empty-state card">
          <span class="empty-icon"><Icon name="calendar" size={26} /></span>
          <p>선택한 기간에 기록이 없습니다</p>
        </div>
      {:else}
        <div class="list-toolbar">
          <span class="list-count">{filteredDailySummaries.length}일</span>
          <button type="button" class="btn btn-ghost btn-sm" data-test="expand-all" onclick={toggleExpandAll}>
            {allExpanded ? '전체 접기' : '전체 펼치기'}
            <span class="expand-icon" class:expanded={allExpanded}><Icon name="chevron-down" size={16} /></span>
          </button>
        </div>

        <ul class="daily-list">
          {#each filteredDailySummaries as day (day.date)}
            {@const expanded = expandedDates.has(day.date)}
            <li class="daily-item" class:expanded>
              <button class="daily-header" onclick={() => toggleExpand(day.date)} aria-expanded={expanded}>
                <div class="daily-left">
                  <span class="daily-date">{formatDateDisplay(day.date)}</span>
                  <span class="daily-meta">
                    {typeFilter === 'purchase' ? `매입 ${day.purchases.length}건` : `${day.count}건`}
                  </span>
                </div>
                <div class="daily-right">
                  {#if typeFilter === 'purchase'}
                    <Money value={-day.purchase} tone="negative" class="daily-profit" />
                  {:else}
                    <span class="daily-sub">
                      <Money value={day.sales} tone="sales" />
                      {#if day.purchase > 0}
                        <Money value={-day.purchase} tone="purchase" />
                      {/if}
                    </span>
                    <Money value={day.netProfit} tone="auto" class="daily-profit" />
                  {/if}
                </div>
                <span class="expand-icon" class:expanded><Icon name="chevron-down" size={18} /></span>
              </button>

              {#if expanded}
                {@render detailRows(day, typeFilter !== 'purchase', typeFilter !== 'service')}
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  {:else}
    <!-- 달력 모드 -->
    <div class="calendar-nav">
      <button class="btn-icon" onclick={goToPrevMonth} aria-label="이전 달">
        <Icon name="chevron-left" size={22} />
      </button>
      <span class="calendar-nav-label">{calendarYear}년 {calendarMonth}월</span>
      <button class="btn-icon" onclick={goToNextMonth} aria-label="다음 달" disabled={isCalendarCurrentMonth}>
        <Icon name="chevron-right" size={22} />
      </button>
    </div>

    {#if calendarLoading}
      <div class="skeleton" style="height: 420px"></div>
    {:else}
      <div class="calendar">
        <div class="calendar-weekdays">
          {#each WEEKDAYS as w, i}
            <span class="calendar-weekday" class:sunday={i === 0} class:saturday={i === 6}>{w}</span>
          {/each}
        </div>

        <div class="calendar-grid">
          {#each calendarCells as cell}
            {#if cell === null}
              <div class="calendar-cell empty"></div>
            {:else}
              {@const entry = calendarDailyMap.get(cell.dateKey)}
              {#if entry}
                <button
                  class="calendar-cell has-data"
                  class:selected={calendarExpandedDate === cell.dateKey}
                  class:today={cell.dateKey === todayKey}
                  onclick={() => toggleCalendarExpand(cell.dateKey)}
                  aria-label="{cell.day}일 순수익 {formatCurrency(entry.netProfit)}"
                >
                  <span class="calendar-day" class:sunday={cell.weekday === 0} class:saturday={cell.weekday === 6}>{cell.day}</span>
                  <span class="calendar-sales">{formatNumber(entry.sales)}</span>
                  <span class="calendar-purchase">{formatNumber(entry.purchase)}</span>
                  <span class="calendar-amount" class:positive={entry.netProfit >= 0} class:negative={entry.netProfit < 0}>
                    {formatNumber(Math.abs(entry.netProfit))}
                  </span>
                  <span class="calendar-count">{entry.count}건</span>
                </button>
              {:else}
                <div class="calendar-cell" class:today={cell.dateKey === todayKey}>
                  <span class="calendar-day" class:sunday={cell.weekday === 0} class:saturday={cell.weekday === 6}>{cell.day}</span>
                </div>
              {/if}
            {/if}
          {/each}
        </div>
      </div>

      {#if calendarExpandedDate && calendarDailyMap.get(calendarExpandedDate)}
        {@const day = calendarDailyMap.get(calendarExpandedDate)}
        <section class="card calendar-detail" aria-label="선택한 날짜 상세">
          <div class="calendar-detail-head">
            <span class="calendar-detail-date">{formatDateDisplay(calendarExpandedDate)}</span>
            <Money value={day.netProfit} tone="auto" class="calendar-detail-net" />
          </div>
          {@render detailRows(day, true, true)}
        </section>
      {/if}
    {/if}
  {/if}

  <!-- 하단 요약 -->
  {#if showSummary}
    <footer class="summary-footer" aria-label="기간 합계">
      <div class="summary-grid">
        <div class="summary-cell">
          <span class="metric-label">총매출</span>
          <Money value={summary.sales} class="summary-value" />
        </div>
        <div class="summary-cell">
          <span class="metric-label">총지출</span>
          <Money value={summary.cost} class="summary-value" />
        </div>
        <div class="summary-cell">
          <span class="metric-label">순수익</span>
          <Money value={summary.net} tone="auto" class="summary-value" />
        </div>
        <div class="summary-cell">
          <span class="metric-label">마진</span>
          <span class="num summary-value">{formatPercent(summary.margin)}</span>
        </div>
      </div>
    </footer>
  {/if}
</div>

<!-- 수정 시트 -->
{#if showModal}
  <Sheet title={recordType === 'purchase' ? '매입 수정' : '매출 수정'} onclose={closeModal}>
    <form id="edit-form" class="edit-form" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
      {#if recordType === 'purchase'}
        <div class="input-group supplier-group">
          <label for="edit-supplier">매입처</label>
          <input
            id="edit-supplier"
            type="text"
            class="input-field"
            bind:value={formSupplier}
            onfocus={() => (showSuggestions = true)}
            onblur={() => setTimeout(() => (showSuggestions = false), 150)}
            autocomplete="off"
          />
          {#if showSuggestions && filteredSuppliers.length > 0}
            <ul class="suggestions">
              {#each filteredSuppliers as s}
                <li>
                  <button type="button" class="suggestion-item" onmousedown={() => selectSupplier(s)}>{s}</button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>

        <AmountInput id="edit-amount" label="금액" bind:value={formAmountStr} />

        <div class="input-group">
          <label for="edit-date">날짜</label>
          <input id="edit-date" type="date" class="input-field" bind:value={formDate} />
        </div>
      {:else}
        <AmountInput id="edit-amount" label="매출액" bind:value={formAmountStr} />

        <div class="input-group">
          <span class="field-label" id="edit-payment-label">결제수단</span>
          <div class="segmented block" role="radiogroup" aria-labelledby="edit-payment-label">
            {#each PAYMENT_METHODS as method}
              <button
                type="button"
                role="radio"
                aria-checked={formPaymentMethod === method}
                onclick={() => (formPaymentMethod = method)}
              >
                {method}
              </button>
            {/each}
          </div>
        </div>

        <div class="row-2">
          <div class="input-group">
            <label for="edit-date">날짜</label>
            <input id="edit-date" type="date" class="input-field" bind:value={formDate} />
          </div>
          <div class="input-group">
            <label for="edit-time">시간</label>
            <input id="edit-time" type="time" class="input-field" bind:value={formTime} />
          </div>
        </div>
      {/if}

      <div class="input-group">
        <label for="edit-memo">메모</label>
        <input id="edit-memo" type="text" class="input-field" placeholder="메모" bind:value={formMemo} autocomplete="off" />
      </div>
    </form>

    {#snippet footer()}
      <button type="button" class="btn btn-danger btn-lg delete-btn" data-test="delete" onclick={handleDelete}>
        <Icon name="trash" size={18} />
        삭제
      </button>
      <button type="submit" form="edit-form" class="btn btn-primary btn-lg save-btn" disabled={formSaving}>
        {formSaving ? '저장 중...' : '수정 저장'}
      </button>
    {/snippet}
  </Sheet>
{/if}

<style>
  .history-page {
    gap: var(--space-4);
    /* 고정 하단 요약(약 76px)에 내용이 가리지 않도록 */
    padding-bottom: calc(96px + var(--space-4));
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .export-btn { margin-right: calc(var(--space-2) * -1); }

  /* ─── 필터 ─── */

  .filter-bar {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .filter-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .range-display {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
    white-space: nowrap;
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

  .list-skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .breakdown-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }
  @media (min-width: 640px) {
    .breakdown-row { grid-template-columns: 1fr 1fr; }
  }
  .breakdown-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .list-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: calc(var(--space-2) * -1);
  }
  .list-count {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  /* ─── 일별 리스트 ─── */

  .daily-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .daily-item {
    background: var(--bg-raised);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: border-color var(--duration-fast) var(--ease-out);
  }
  .daily-item.expanded { border-color: var(--border-default); }

  .daily-header {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 72px;
    padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    gap: var(--space-2);
    text-align: left;
  }
  .daily-header:hover { background: var(--bg-hover); }

  .daily-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .daily-date {
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
  }

  .daily-meta {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  /* 순수익이 한눈에 보는 결론, 매출/매입은 보조 지표
     (달력 모드 색상 규칙: 매출=파랑/매입=회색/순수익=녹적) */
  .daily-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    flex-shrink: 0;
  }

  .daily-sub {
    display: flex;
    gap: var(--space-2);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
  }

  .daily-right :global(.daily-profit) {
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
  }

  .expand-icon {
    display: flex;
    flex-shrink: 0;
    color: var(--text-tertiary);
    transition: transform var(--duration-fast) var(--ease-out);
  }
  .expand-icon.expanded { transform: rotate(180deg); }

  /* ─── 상세 행 ─── */

  .daily-detail {
    display: flex;
    flex-direction: column;
    padding: 0 var(--space-2) var(--space-2);
    border-top: 1px solid var(--border-subtle);
    animation: slide-in var(--duration-fast) var(--ease-out);
  }

  @keyframes slide-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .detail-row {
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr) auto 16px;
    gap: var(--space-2);
    align-items: center;
    min-height: 52px;
    padding: var(--space-2);
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
    transition: background var(--duration-fast) var(--ease-out);
  }
  .detail-row:hover { background: var(--bg-hover); }
  .detail-row:active { background: var(--bg-active); }

  .detail-row.first-purchase {
    margin-top: var(--space-1);
    border-top: 1px dashed var(--border-default);
    border-radius: 0 0 var(--radius-sm) var(--radius-sm);
    padding-top: var(--space-3);
  }

  .detail-time {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .badge-purchase {
    display: inline-block;
    padding: 1px 6px;
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
  }

  .detail-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .detail-title {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--accent-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail-memo {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail-row :global(.detail-amount) {
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    text-align: right;
  }
  .detail-row :global(.purchase-amount) { color: var(--negative); }

  .detail-row :global(.detail-chevron) { color: var(--text-tertiary); }

  /* ─── 달력 ─── */

  .calendar-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .calendar-nav-label {
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    letter-spacing: -0.02em;
  }

  .calendar {
    margin: 0 calc(var(--space-2) * -1);
  }

  .calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    padding-bottom: var(--space-2);
  }

  .calendar-weekday {
    text-align: center;
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--text-tertiary);
  }
  .calendar-weekday.sunday { color: var(--negative); }
  .calendar-weekday.saturday { color: var(--accent-text); }

  /* 셀 높이는 grid-auto-rows로 — 정사각형은 4줄이 들어갈 자리가 부족 */
  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    grid-auto-rows: minmax(78px, auto);
    gap: 3px;
  }

  .calendar-cell {
    position: relative;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    border: none;
    border-radius: var(--radius-sm);
    background: var(--bg-raised);
    box-shadow: inset 0 0 0 1px var(--border-subtle);
    color: var(--text-primary);
    cursor: pointer;
    overflow: hidden;
    transition: background var(--duration-fast) var(--ease-out);
  }
  button.calendar-cell:hover { background: var(--bg-hover); }
  .calendar-cell.selected {
    background: var(--accent-muted);
    box-shadow: inset 0 0 0 1.5px var(--accent);
  }
  .calendar-cell.empty,
  div.calendar-cell {
    background: transparent;
    box-shadow: none;
    cursor: default;
  }

  .calendar-day {
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--text-secondary);
    line-height: 1.3;
  }
  .calendar-day.sunday { color: var(--negative); }
  .calendar-day.saturday { color: var(--accent-text); }

  /* 오늘: 날짜 숫자에 브라스 원 */
  .calendar-cell.today .calendar-day {
    min-width: 20px;
    padding: 0 4px;
    border-radius: var(--radius-full);
    background: var(--brand);
    color: var(--on-brand);
  }

  /* 매출/매입은 작고 흐리게, 순수익만 크고 굵게 (장평 압축으로 금액 전체를 한 줄에) */
  .calendar-sales,
  .calendar-purchase {
    font-size: 10px;
    font-weight: var(--weight-medium);
    white-space: nowrap;
    line-height: 1.25;
    transform: scaleX(0.8);
  }
  .calendar-sales { color: var(--accent-text); }
  .calendar-purchase { color: var(--text-tertiary); }

  .calendar-amount {
    font-size: 13px;
    font-weight: var(--weight-bold);
    white-space: nowrap;
    line-height: 1.3;
    letter-spacing: -0.02em;
    transform: scaleX(0.68);
  }

  .calendar-count {
    font-size: 10px;
    color: var(--text-tertiary);
    line-height: 1.25;
  }

  .calendar-detail {
    padding: var(--space-2) 0 0;
  }
  .calendar-detail-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-4) var(--space-3);
  }
  .calendar-detail-date {
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
  }
  .calendar-detail-head :global(.calendar-detail-net) {
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
  }

  /* ─── 하단 요약 ─── */

  .summary-footer {
    position: fixed;
    bottom: calc(var(--nav-height) + var(--safe-bottom));
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: var(--max-width);
    background: color-mix(in srgb, var(--bg-raised) 94%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--border-subtle);
    padding: var(--space-3) var(--space-4);
    z-index: 40;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: 1.15fr 1.1fr 1.15fr 0.6fr;
    gap: var(--space-2);
  }

  .summary-cell {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .summary-cell:last-child { text-align: right; }

  .summary-cell :global(.summary-value) {
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    letter-spacing: -0.02em;
  }

  /* ─── 수정 시트 ─── */

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }
  .supplier-group { position: relative; }
  .delete-btn { flex: 0 0 auto !important; padding: 0 var(--space-5); }
  .save-btn { flex: 1; }

  /* ─── 데스크톱 ─── */
  @media (min-width: 1024px) {
    .history-page { padding-bottom: var(--space-10); }

    .filter-bar {
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-4);
    }
    .filter-row { gap: var(--space-4); }

    .daily-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: var(--space-3);
      align-items: start;
    }

    .daily-header { padding: var(--space-4) var(--space-4) var(--space-4) var(--space-5); }
    .daily-date { font-size: var(--text-lg); }
    .daily-right :global(.daily-profit) { font-size: var(--text-xl); }
    .detail-row { min-height: 48px; }

    .calendar { margin: 0; }
    .calendar-grid {
      grid-auto-rows: minmax(124px, auto);
      gap: 6px;
    }
    .calendar-cell {
      gap: 4px;
      padding: var(--space-2);
      border-radius: var(--radius-md);
    }
    .calendar-day { font-size: var(--text-sm); }
    .calendar-sales,
    .calendar-purchase {
      font-size: 14px;
      transform: none;
    }
    .calendar-amount {
      font-size: 22px;
      transform: none;
    }
    .calendar-count { font-size: 12px; }
    .calendar-cell.today .calendar-day { min-width: 26px; }

    .summary-footer {
      position: static;
      max-width: none;
      width: auto;
      transform: none;
      backdrop-filter: none;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: var(--space-5) var(--space-6);
      background: var(--bg-raised);
    }
    .summary-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-4);
    }
    .summary-cell:last-child { text-align: left; }
    .summary-cell .metric-label { font-size: var(--text-sm); }
    .summary-cell :global(.summary-value) {
      font-size: var(--text-2xl);
      font-weight: var(--weight-heavy);
    }
  }
</style>

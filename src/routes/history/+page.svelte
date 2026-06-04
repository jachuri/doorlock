<script>
  import { onMount } from 'svelte';
  import { getServicesByDateRange, getPurchasesByDateRange, updateService, deleteService } from '$lib/db.js';
  import { exportToExcel } from '$lib/excel.js';
  import {
    formatDate, formatDateDisplay, formatCurrency, formatPercent,
    formatAmountInput, parseAmount,
    getThisMonthRange, getThisWeekRange, getLastMonthRange
  } from '$lib/utils.js';

  const PERIODS = [
    { key: 'today', label: '오늘' },
    { key: 'week', label: '이번 주' },
    { key: 'month', label: '이번 달' },
    { key: 'lastMonth', label: '지난 달' },
    { key: 'custom', label: '직접선택' },
  ];

  const PAYMENT_METHODS = ['현금', '카드', '계좌이체'];

  let selectedPeriod = $state('month');
  let startDate = $state('');
  let endDate = $state('');
  let loading = $state(true);
  let exporting = $state(false);

  let services = $state([]);
  let purchases = $state([]);

  // 수정 모달
  let showModal = $state(false);
  let editingRecord = $state(null);
  let formDate = $state('');
  let formTime = $state('');
  let formPaymentMethod = $state('카드');
  let formAmountStr = $state('');
  let formPartsCostStr = $state('');
  let formMemo = $state('');
  let formSaving = $state(false);

  // 토스트
  let toast = $state({ show: false, message: '', type: 'success' });

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

  // ─── 수정/삭제 ───

  function openEditModal(record) {
    editingRecord = record;
    formDate = record.date;
    formTime = record.time || '';
    formPaymentMethod = record.paymentMethod || '카드';
    formAmountStr = record.amount > 0 ? record.amount.toLocaleString('ko-KR') : '';
    formPartsCostStr = record.partsCost > 0 ? record.partsCost.toLocaleString('ko-KR') : '';
    formMemo = record.memo || '';
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    editingRecord = null;
  }

  function onAmountInput(e) {
    formAmountStr = formatAmountInput(e.target.value);
  }

  function onPartsCostInput(e) {
    formPartsCostStr = formatAmountInput(e.target.value);
  }

  async function handleSave() {
    const amount = parseAmount(formAmountStr);
    if (amount <= 0) {
      showToast('매출액을 입력해주세요', 'error');
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

      showToast('수정 완료');
      closeModal();
      await loadData();
    } catch {
      showToast('수정에 실패했습니다', 'error');
    } finally {
      formSaving = false;
    }
  }

  async function handleDelete() {
    if (!editingRecord) return;
    if (!confirm(`${formatCurrency(editingRecord.amount)} (${editingRecord.time || '--:--'})\n이 기록을 삭제하시겠습니까?`)) return;

    try {
      await deleteService(editingRecord.id);
      showToast('삭제 완료');
      closeModal();
      await loadData();
    } catch {
      showToast('삭제에 실패했습니다', 'error');
    }
  }

  function showToast(message, type = 'success') {
    toast = { show: true, message, type };
    setTimeout(() => { toast = { ...toast, show: false }; }, 2000);
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
                <button class="detail-row detail-row-btn" onclick={() => openEditModal(s)}>
                  <span class="detail-time">{s.time || '--:--'}</span>
                  <span class="detail-method">{s.paymentMethod}</span>
                  <span class="detail-memo">{s.memo || ''}</span>
                  <span class="detail-amount font-mono">{formatCurrency(s.amount)}</span>
                  <svg class="detail-edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              {/each}
              {#if day.purchase > 0}
                <div class="detail-row purchase-row">
                  <span class="detail-time">매입</span>
                  <span></span>
                  <span></span>
                  <span class="detail-amount font-mono text-negative">-{formatCurrency(day.purchase)}</span>
                  <span></span>
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

<!-- 매출 수정 모달 -->
{#if showModal}
  <div class="overlay" onclick={closeModal} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && closeModal()} role="dialog" aria-label="매출 수정" tabindex="-1">
      <div class="modal-header">
        <h2>매출 수정</h2>
        <div class="modal-actions">
          <button class="btn btn-danger btn-sm" onclick={handleDelete}>삭제</button>
          <button class="btn-icon" onclick={closeModal} aria-label="닫기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
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

        <div class="input-group">
          <label for="edit-amount">매출액</label>
          <div class="input-with-unit">
            <input
              id="edit-amount"
              type="text"
              inputmode="numeric"
              class="input-field input-amount"
              placeholder="0"
              value={formAmountStr}
              oninput={onAmountInput}
              autocomplete="off"
            />
            <span class="input-unit">원</span>
          </div>
        </div>

        <div class="input-group">
          <label for="edit-parts">부품비</label>
          <div class="input-with-unit">
            <input
              id="edit-parts"
              type="text"
              inputmode="numeric"
              class="input-field input-amount"
              placeholder="0"
              value={formPartsCostStr}
              oninput={onPartsCostInput}
              autocomplete="off"
            />
            <span class="input-unit">원</span>
          </div>
        </div>

        <div class="input-group">
          <label id="edit-payment-label">결제수단</label>
          <div class="chip-group" role="radiogroup" aria-labelledby="edit-payment-label">
            {#each PAYMENT_METHODS as method}
              <button
                type="button"
                class="chip"
                class:active={formPaymentMethod === method}
                onclick={() => formPaymentMethod = method}
              >
                {method}
              </button>
            {/each}
          </div>
        </div>

        <div class="input-group">
          <label for="edit-memo">메모</label>
          <input
            id="edit-memo"
            type="text"
            class="input-field"
            placeholder="메모"
            bind:value={formMemo}
            autocomplete="off"
          />
        </div>

        <button type="submit" class="btn btn-primary btn-lg btn-block" disabled={formSaving}>
          {formSaving ? '저장 중...' : '수정 저장'}
        </button>
      </form>
    </div>
  </div>
{/if}

<div class="toast" class:show={toast.show} class:success={toast.type === 'success'} class:error={toast.type === 'error'}>
  {toast.message}
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
    gap: var(--space-1);
    animation: slide-in var(--duration-fast) var(--ease-out);
  }

  @keyframes slide-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .detail-row {
    display: grid;
    grid-template-columns: 48px 56px 1fr auto 20px;
    gap: var(--space-2);
    align-items: center;
    font-size: var(--text-xs);
    color: var(--text-secondary);
    padding: var(--space-2) var(--space-1);
  }

  .detail-row-btn {
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: background var(--duration-fast) var(--ease-out);
  }
  .detail-row-btn:hover {
    background: var(--bg-hover);
  }
  .detail-row-btn:active {
    background: var(--bg-active);
  }

  .detail-edit-icon {
    color: var(--text-tertiary);
    opacity: 0.5;
  }
  .detail-row-btn:hover .detail-edit-icon {
    opacity: 1;
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

  /* 모달 */
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-5);
    border-bottom: 1px solid var(--border-subtle);
    position: sticky;
    top: 0;
    background: var(--bg-raised);
    z-index: 1;
  }
  .modal-header h2 {
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
  }
  .modal-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .btn-sm {
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
  }
  .row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }
  .input-with-unit {
    position: relative;
  }
  .input-unit {
    position: absolute;
    right: var(--space-4);
    top: 50%;
    transform: translateY(-50%);
    font-size: var(--text-sm);
    color: var(--text-tertiary);
    pointer-events: none;
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

  input[type="date"],
  input[type="time"] { color-scheme: dark; }
</style>

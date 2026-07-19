<script>
  import { onMount } from 'svelte';
  import {
    getAllPurchases, addPurchase, updatePurchase, deletePurchase, getSupplierList
  } from '$lib/db.js';
  import { formatDate, formatDateDisplay, formatCurrency, formatAmountInput, parseAmount } from '$lib/utils.js';

  let purchases = $state([]);
  let supplierList = $state([]);
  let loading = $state(true);

  // 모달 상태
  let showModal = $state(false);
  let editingRecord = $state(null);

  // 폼
  let formDate = $state(formatDate());
  let formSupplier = $state('');
  let formAmountStr = $state('');
  let formMemo = $state('');
  let formSaving = $state(false);

  // 자동완성
  let showSuggestions = $state(false);
  let filteredSuppliers = $derived(
    formSupplier.length > 0
      ? supplierList.filter((s) => s.toLowerCase().includes(formSupplier.toLowerCase()))
      : []
  );

  // 매입처별 집계
  let supplierTotals = $derived.by(() => {
    /** @type {Map<string, number>} */
    const map = new Map();
    for (const p of purchases) {
      map.set(p.supplier, (map.get(p.supplier) || 0) + p.amount);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1]);
  });

  // 날짜별 그룹핑
  let groupedByDate = $derived.by(() => {
    /** @type {Map<string, Array>} */
    const map = new Map();
    const sorted = [...purchases].sort((a, b) => b.date.localeCompare(a.date));
    for (const p of sorted) {
      if (!map.has(p.date)) map.set(p.date, []);
      map.get(p.date).push(p);
    }
    return map;
  });

  // 토스트
  let toast = $state({ show: false, message: '', type: 'success' });

  onMount(async () => {
    await loadData();
    loading = false;
  });

  async function loadData() {
    purchases = await getAllPurchases();
    supplierList = await getSupplierList();
  }

  function openAddModal() {
    editingRecord = null;
    formDate = formatDate();
    formSupplier = '';
    formAmountStr = '';
    formMemo = '';
    showModal = true;
  }

  function openEditModal(record) {
    editingRecord = record;
    formDate = record.date;
    formSupplier = record.supplier;
    formAmountStr = record.amount > 0 ? record.amount.toLocaleString('ko-KR') : '';
    formMemo = record.memo || '';
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    showSuggestions = false;
  }

  function selectSupplier(name) {
    formSupplier = name;
    showSuggestions = false;
  }

  function onAmountInput(e) {
    formAmountStr = formatAmountInput(e.target.value);
  }

  async function handleSave() {
    if (!formSupplier.trim()) {
      showToast('매입처를 입력해주세요', 'error');
      return;
    }
    const amount = parseAmount(formAmountStr);
    if (amount <= 0) {
      showToast('금액을 입력해주세요', 'error');
      return;
    }

    formSaving = true;
    try {
      const data = {
        date: formDate,
        supplier: formSupplier.trim(),
        amount,
        memo: formMemo.trim() || ''
      };

      if (editingRecord) {
        await updatePurchase({ ...editingRecord, ...data });
        showToast('수정 완료');
      } else {
        await addPurchase(data);
        showToast('매입 추가 완료');
      }

      await loadData();
      closeModal();
    } catch {
      showToast('저장에 실패했습니다', 'error');
    } finally {
      formSaving = false;
    }
  }

  async function handleDelete(record) {
    if (!confirm(`${record.supplier} — ${formatCurrency(record.amount)}\n삭제하시겠습니까?`)) return;
    await deletePurchase(record.id);
    showToast('삭제 완료');
    await loadData();
  }

  function showToast(message, type = 'success') {
    toast = { show: true, message, type };
    setTimeout(() => { toast = { ...toast, show: false }; }, 2000);
  }
</script>

<svelte:head>
  <title>매입 관리 — 도어락 장부</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1>매입 관리</h1>
    <button class="btn btn-primary" onclick={openAddModal}>+ 추가</button>
  </header>

  {#if loading}
    <div class="loading"><div class="loading-dot"></div></div>
  {:else if purchases.length === 0}
    <div class="empty-state">
      <p>매입 내역이 없습니다</p>
      <button class="btn btn-primary" onclick={openAddModal}>첫 매입 추가</button>
    </div>
  {:else}
    <!-- 매입처별 집계 -->
    {#if supplierTotals.length > 0}
      <section class="section">
        <details class="summary-panel card">
          <summary class="summary-header">
            <span>매입처별 집계 · {supplierTotals.length}개</span>
            <span class="font-mono font-semibold">
              {formatCurrency(purchases.reduce((s, p) => s + p.amount, 0))}
            </span>
          </summary>
          <ul class="summary-list">
            {#each supplierTotals as [supplier, total]}
              <li class="summary-item">
                <span class="supplier-badge">{supplier.charAt(0)}</span>
                <span class="supplier-name">{supplier}</span>
                <span class="font-mono">{formatCurrency(total)}</span>
              </li>
            {/each}
          </ul>
        </details>
      </section>
    {/if}

    <!-- 날짜별 매입 내역 -->
    <section class="section records-section">
      <h2 class="section-title">매입 내역</h2>
      {#each [...groupedByDate] as [dateKey, records]}
        <div class="date-group">
          <div class="date-group-header">
            <span>{formatDateDisplay(dateKey)}</span>
            <span class="font-mono text-secondary">
              {formatCurrency(records.reduce((s, r) => s + r.amount, 0))}
            </span>
          </div>
          <ul class="purchase-list">
            {#each records as record}
              <li class="purchase-item">
                <button class="purchase-content" onclick={() => openEditModal(record)}>
                  <div class="purchase-left">
                    <span class="purchase-supplier">{record.supplier}</span>
                    {#if record.memo}
                      <span class="purchase-memo">{record.memo}</span>
                    {/if}
                  </div>
                  <span class="purchase-amount font-mono">{formatCurrency(record.amount)}</span>
                </button>
                <button class="delete-btn" onclick={() => handleDelete(record)} aria-label="삭제">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </section>
  {/if}
</div>

<!-- 매입 추가/수정 모달 -->
{#if showModal}
  <div class="overlay" onclick={closeModal} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && closeModal()} role="dialog" aria-label="매입 입력" tabindex="-1">
      <div class="modal-header">
        <h2>{editingRecord ? '매입 수정' : '매입 추가'}</h2>
        <button class="btn-icon" onclick={closeModal} aria-label="닫기">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div class="input-group">
          <label for="p-date">날짜</label>
          <input id="p-date" type="date" class="input-field" bind:value={formDate} />
        </div>

        <div class="input-group" style="position:relative">
          <label for="p-supplier">매입처</label>
          <input
            id="p-supplier"
            type="text"
            class="input-field"
            placeholder="매입처를 입력하세요"
            bind:value={formSupplier}
            onfocus={() => showSuggestions = true}
            onblur={() => setTimeout(() => showSuggestions = false, 150)}
            autocomplete="off"
          />
          {#if showSuggestions && filteredSuppliers.length > 0}
            <ul class="suggestions">
              {#each filteredSuppliers as s}
                <li>
                  <button type="button" class="suggestion-item" onmousedown={() => selectSupplier(s)}>
                    {s}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>

        <div class="input-group">
          <label for="p-amount">금액</label>
          <div class="input-with-unit">
            <input
              id="p-amount"
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
          <label for="p-memo">메모 <span class="label-optional">선택</span></label>
          <input
            id="p-memo"
            type="text"
            class="input-field"
            placeholder="추가 정보"
            bind:value={formMemo}
            autocomplete="off"
          />
        </div>

        <button type="submit" class="btn btn-primary btn-lg btn-block" disabled={formSaving}>
          {formSaving ? '저장 중...' : editingRecord ? '수정' : '추가'}
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

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .section-title {
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    color: var(--text-secondary);
  }

  /* 집계 패널 */
  .summary-panel {
    cursor: pointer;
  }

  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    list-style: none;
  }
  .summary-header::-webkit-details-marker { display: none; }

  .summary-list {
    list-style: none;
    margin-top: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--text-sm);
  }

  .supplier-badge {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    background: var(--accent-muted);
    color: var(--accent-text);
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    flex-shrink: 0;
  }

  .supplier-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* 날짜 그룹 */
  .date-group {
    display: flex;
    flex-direction: column;
  }

  .date-group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) 0;
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-subtle);
  }

  .purchase-list {
    list-style: none;
  }

  .purchase-item {
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--border-subtle);
  }
  .purchase-item:last-child { border-bottom: none; }

  .purchase-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) 0;
    background: none;
    border: none;
    color: inherit;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
  }

  .purchase-left {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .purchase-supplier {
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
  }

  .purchase-memo {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .purchase-amount {
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    flex-shrink: 0;
  }

  .delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    margin-left: var(--space-2);
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    flex-shrink: 0;
  }
  .delete-btn:hover {
    background: var(--negative-muted);
    color: var(--negative);
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

  /* 자동완성 */
  .suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: var(--space-1);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    list-style: none;
    z-index: 10;
    max-height: 160px;
    overflow-y: auto;
  }

  .suggestion-item {
    display: block;
    width: 100%;
    padding: var(--space-3) var(--space-4);
    background: none;
    border: none;
    color: var(--text-primary);
    font-family: inherit;
    font-size: var(--text-sm);
    text-align: left;
    cursor: pointer;
  }
  .suggestion-item:hover {
    background: var(--bg-hover);
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
  .label-optional {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    font-weight: var(--weight-normal);
  }

  /* 로딩/빈상태 */
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

  input[type="date"] { color-scheme: dark; }

  /* ─── 데스크톱 ─── */
  @media (min-width: 1024px) {
    .page-header h1 {
      font-size: var(--text-2xl);
    }

    .records-section {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: var(--space-4);
      align-items: start;
    }
    .records-section .section-title {
      grid-column: 1 / -1;
    }
    .date-group {
      background: var(--bg-raised);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: var(--space-4) var(--space-5);
    }
    .date-group-header {
      padding-top: 0;
    }
  }
</style>

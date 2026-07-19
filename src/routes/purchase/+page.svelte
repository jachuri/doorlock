<script>
  import { onMount } from 'svelte';
  import { addPurchase, getSupplierList } from '$lib/db.js';
  import { formatDate, formatAmountInput, parseAmount } from '$lib/utils.js';

  let date = $state(formatDate());
  let supplier = $state('');
  let amountStr = $state('');
  let memo = $state('');

  let supplierList = $state([]);
  let showSuggestions = $state(false);
  let filteredSuppliers = $derived(
    supplier.length > 0
      ? supplierList.filter((s) => s.toLowerCase().includes(supplier.toLowerCase()))
      : []
  );

  let saving = $state(false);
  let toast = $state({ show: false, message: '', type: 'success' });

  let amount = $derived(parseAmount(amountStr));

  onMount(async () => {
    supplierList = await getSupplierList();
  });

  function onAmountInput(e) {
    amountStr = formatAmountInput(e.target.value);
  }

  /** @param {string} name */
  function selectSupplier(name) {
    supplier = name;
    showSuggestions = false;
  }

  async function handleSave() {
    if (!supplier.trim()) {
      showToast('매입처를 입력해주세요', 'error');
      return;
    }
    if (amount <= 0) {
      showToast('금액을 입력해주세요', 'error');
      return;
    }

    saving = true;
    try {
      await addPurchase({
        date,
        supplier: supplier.trim(),
        amount,
        memo: memo.trim() || ''
      });

      showToast('저장 완료', 'success');
      resetForm();
      supplierList = await getSupplierList();
    } catch {
      showToast('저장에 실패했습니다', 'error');
    } finally {
      saving = false;
    }
  }

  function resetForm() {
    date = formatDate();
    supplier = '';
    amountStr = '';
    memo = '';
  }

  /**
   * @param {string} message
   * @param {'success' | 'error'} type
   */
  function showToast(message, type = 'success') {
    toast = { show: true, message, type };
    setTimeout(() => {
      toast = { ...toast, show: false };
    }, 2000);
  }
</script>

<svelte:head>
  <title>매입 입력 — 도어락 장부</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1>매입 입력</h1>
  </header>

  <form class="form" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
    <!-- 날짜 -->
    <div class="input-group">
      <label for="date">날짜</label>
      <input id="date" type="date" class="input-field" bind:value={date} />
    </div>

    <!-- 매입처 -->
    <div class="input-group" style="position:relative">
      <label for="supplier">매입처</label>
      <input
        id="supplier"
        type="text"
        class="input-field"
        placeholder="매입처를 입력하세요"
        bind:value={supplier}
        onfocus={() => (showSuggestions = true)}
        onblur={() => setTimeout(() => (showSuggestions = false), 150)}
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

    <!-- 금액 -->
    <div class="input-group">
      <label for="amount">금액</label>
      <div class="input-with-unit">
        <input
          id="amount"
          type="text"
          inputmode="numeric"
          class="input-field input-amount"
          placeholder="0"
          value={amountStr}
          oninput={onAmountInput}
          autocomplete="off"
        />
        <span class="input-unit">원</span>
      </div>
    </div>

    <!-- 메모 -->
    <div class="input-group">
      <label for="memo">메모 <span class="label-optional">선택</span></label>
      <input
        id="memo"
        type="text"
        class="input-field"
        placeholder="추가 정보"
        bind:value={memo}
        autocomplete="off"
      />
    </div>

    <!-- 저장 -->
    <button type="submit" class="btn btn-primary btn-lg btn-block save-btn" disabled={saving}>
      {saving ? '저장 중...' : '저장'}
    </button>
  </form>
</div>

<!-- 토스트 -->
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

  .page-header h1 {
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    letter-spacing: -0.02em;
    padding-top: var(--space-2);
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
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

  .save-btn {
    margin-top: var(--space-2);
  }

  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  input[type="date"] { color-scheme: dark; }

  /* ─── 데스크톱 ─── */
  @media (min-width: 1024px) {
    .page-header {
      max-width: 560px;
      margin: 0 auto;
      width: 100%;
    }
    .page-header h1 {
      font-size: var(--text-2xl);
    }
    .form {
      max-width: 560px;
      margin: 0 auto;
      width: 100%;
      gap: var(--space-6);
    }
  }
</style>

<script>
  import { onMount } from 'svelte';
  import { addPurchase, getSupplierList } from '$lib/db.js';
  import { formatDate, parseAmount } from '$lib/utils.js';
  import { toast } from '$lib/ui.svelte.js';
  import AmountInput from '$lib/components/AmountInput.svelte';

  let date = $state(formatDate());
  let supplier = $state('');
  let amountStr = $state('');
  let memo = $state('');

  let supplierList = $state([]);
  let showSuggestions = $state(false);
  let filteredSuppliers = $derived(
    supplier.length > 0
      ? supplierList.filter((s) => s.toLowerCase().includes(supplier.toLowerCase()) && s !== supplier)
      : []
  );

  let saving = $state(false);

  let amount = $derived(parseAmount(amountStr));

  onMount(async () => {
    supplierList = await getSupplierList();
  });

  /** @param {string} name */
  function selectSupplier(name) {
    supplier = name;
    showSuggestions = false;
  }

  async function handleSave() {
    if (!supplier.trim()) {
      toast.show('매입처를 입력해주세요', 'error');
      document.getElementById('supplier')?.focus();
      return;
    }
    if (amount <= 0) {
      toast.show('금액을 입력해주세요', 'error');
      document.getElementById('amount')?.focus();
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

      toast.show(`${supplier.trim()} ${amount.toLocaleString('ko-KR')}원 저장 완료`, 'success');
      resetForm();
      supplierList = await getSupplierList();
    } catch {
      toast.show('저장에 실패했습니다', 'error');
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
</script>

<svelte:head>
  <title>매입 입력 — 도어락 장부</title>
</svelte:head>

<div class="page form-page">
  <header class="page-header">
    <h1 class="page-title">매입 입력</h1>
  </header>

  <form class="form" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
    <div class="input-group supplier-group">
      <label for="supplier">매입처</label>
      <input
        id="supplier"
        type="text"
        class="input-field"
        placeholder="매입처 이름"
        bind:value={supplier}
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
      {#if supplierList.length > 0}
        <div class="chip-scroll" aria-label="자주 쓰는 매입처">
          {#each supplierList.slice(0, 12) as s}
            <button type="button" class="chip" class:active={supplier === s} onclick={() => selectSupplier(s)}>{s}</button>
          {/each}
        </div>
      {/if}
    </div>

    <AmountInput id="amount" label="금액" size="lg" bind:value={amountStr} quick={[10000, 50000, 100000]} />

    <div class="input-group">
      <label for="date">날짜</label>
      <input id="date" type="date" class="input-field" bind:value={date} />
    </div>

    <div class="input-group">
      <label for="memo">메모 <span class="label-optional">선택</span></label>
      <input id="memo" type="text" class="input-field" placeholder="품목, 수량 등" bind:value={memo} autocomplete="off" />
    </div>

    <div class="save-bar">
      <button type="submit" class="btn btn-primary btn-lg btn-block" disabled={saving}>
        {#if saving}
          저장 중...
        {:else if amount > 0}
          <span class="num">{amount.toLocaleString('ko-KR')}원</span> 매입 저장
        {:else}
          저장
        {/if}
      </button>
    </div>
  </form>
</div>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .supplier-group { position: relative; }
  .supplier-group .chip-scroll { margin-top: var(--space-1); }

  .save-bar {
    position: sticky;
    bottom: calc(var(--nav-height) + var(--safe-bottom));
    margin: 0 calc(var(--space-4) * -1);
    padding: var(--space-3) var(--space-4);
    background: linear-gradient(to top, var(--bg-base) 70%, transparent);
    z-index: 5;
  }

  @media (min-width: 1024px) {
    .form-page {
      max-width: 560px !important;
    }
    .save-bar {
      position: static;
      margin: 0;
      padding: 0;
      background: none;
    }
  }
</style>

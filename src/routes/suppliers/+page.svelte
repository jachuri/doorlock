<script>
  import { onMount } from 'svelte';
  import { getSuppliers, addSupplier, updateSupplier, deleteSupplier } from '$lib/db.js';
  import { formatCurrency } from '$lib/utils.js';

  const CATEGORIES = ['광고', '재고', '비품', '기타'];

  let loading = $state(true);
  let suppliers = $state([]);
  let categoryFilter = $state('all');

  let editingId = $state(/** @type {number | null} */ (null));
  let editingName = $state('');

  let newName = $state('');
  let newCategory = $state('기타');
  let adding = $state(false);

  let toast = $state({ show: false, message: '', type: 'success' });

  onMount(loadData);

  async function loadData() {
    loading = true;
    const result = await getSuppliers();
    if (Array.isArray(result)) {
      suppliers = result;
    } else {
      suppliers = [];
      showToast(result?.message || '매입처 목록을 불러오지 못했습니다', 'error');
    }
    loading = false;
  }

  let filteredSuppliers = $derived(
    categoryFilter === 'all' ? suppliers : suppliers.filter((s) => s.category === categoryFilter)
  );

  let categoryCounts = $derived.by(() => {
    const map = new Map(CATEGORIES.map((c) => [c, 0]));
    for (const s of suppliers) map.set(s.category, (map.get(s.category) || 0) + 1);
    return map;
  });

  /**
   * @param {string} message
   * @param {'success' | 'error'} type
   */
  function showToast(message, type = 'success') {
    toast = { show: true, message, type };
    setTimeout(() => { toast = { ...toast, show: false }; }, 2500);
  }

  /**
   * @param {{ id: number, name: string, category: string }} supplier
   * @param {string} category
   */
  async function changeCategory(supplier, category) {
    const result = await updateSupplier(supplier.id, { name: supplier.name, category });
    if (!result.success) { showToast(result.message || '변경 실패', 'error'); return; }
    await loadData();
    showToast('카테고리 변경 완료');
  }

  /** @param {{ id: number, name: string }} supplier */
  function startEdit(supplier) {
    editingId = supplier.id;
    editingName = supplier.name;
  }

  function cancelEdit() {
    editingId = null;
    editingName = '';
  }

  /** @param {{ id: number, name: string, category: string }} supplier */
  async function saveEdit(supplier) {
    const trimmed = editingName.trim();
    if (!trimmed) { showToast('이름을 입력해주세요', 'error'); return; }
    if (trimmed === supplier.name) { cancelEdit(); return; }

    const result = await updateSupplier(supplier.id, { name: trimmed, category: supplier.category });
    if (!result.success) { showToast(result.message || '수정 실패', 'error'); return; }
    cancelEdit();
    await loadData();
    showToast(result.merged ? `"${trimmed}"로 병합되었습니다` : '수정 완료');
  }

  /** @param {SubmitEvent} e */
  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    adding = true;
    const result = await addSupplier({ name: trimmed, category: newCategory });
    adding = false;

    if (!result.success) { showToast(result.message || '추가 실패', 'error'); return; }
    newName = '';
    newCategory = '기타';
    await loadData();
    showToast('매입처 추가 완료');
  }

  /** @param {{ id: number, name: string }} supplier */
  async function handleDelete(supplier) {
    if (!confirm(`"${supplier.name}"을(를) 삭제하시겠습니까?`)) return;
    const result = await deleteSupplier(supplier.id);
    if (!result.success) { showToast(result.message || '삭제 실패', 'error'); return; }
    await loadData();
    showToast('삭제 완료');
  }
</script>

<svelte:head>
  <title>매입처 관리 · 도어락 장부</title>
</svelte:head>

<div class="page suppliers-page">
  <header class="suppliers-header">
    <h1>매입처 관리</h1>
    <span class="header-sub">이름 오타 교정(병합)과 카테고리 분류 — 모바일 입력에는 영향 없음</span>
  </header>

  <form class="add-form card" onsubmit={handleAdd}>
    <input type="text" class="input-field" placeholder="새 매입처 이름" bind:value={newName} />
    <select class="input-field" bind:value={newCategory}>
      {#each CATEGORIES as c}
        <option value={c}>{c}</option>
      {/each}
    </select>
    <button type="submit" class="btn btn-primary" disabled={adding || !newName.trim()}>+ 추가</button>
  </form>

  <div class="chip-group">
    <button type="button" class="chip" class:active={categoryFilter === 'all'} onclick={() => (categoryFilter = 'all')}>
      전체 · {suppliers.length}
    </button>
    {#each CATEGORIES as c}
      <button type="button" class="chip" class:active={categoryFilter === c} onclick={() => (categoryFilter = c)}>
        {c} · {categoryCounts.get(c) || 0}
      </button>
    {/each}
  </div>

  {#if loading}
    <div class="loading"><div class="loading-dot"></div></div>
  {:else if filteredSuppliers.length === 0}
    <div class="empty-state">
      <p>매입처가 없습니다</p>
    </div>
  {:else}
    <ul class="supplier-list">
      {#each filteredSuppliers as supplier (supplier.id)}
        <li class="supplier-row card">
          <div class="supplier-name-cell">
            {#if editingId === supplier.id}
              <input
                type="text"
                class="input-field"
                bind:value={editingName}
                onkeydown={(e) => { if (e.key === 'Enter') saveEdit(supplier); if (e.key === 'Escape') cancelEdit(); }}
              />
              <button type="button" class="btn btn-ghost btn-sm" onclick={() => saveEdit(supplier)}>저장</button>
              <button type="button" class="btn btn-ghost btn-sm" onclick={cancelEdit}>취소</button>
            {:else}
              <button type="button" class="supplier-name" onclick={() => startEdit(supplier)}>
                {supplier.name}
              </button>
            {/if}
          </div>

          <select
            class="input-field category-select"
            value={supplier.category}
            onchange={(e) => changeCategory(supplier, /** @type {HTMLSelectElement} */ (e.target).value)}
          >
            {#each CATEGORIES as c}
              <option value={c}>{c}</option>
            {/each}
          </select>

          <div class="supplier-stats">
            <span>{supplier.purchaseCount}건</span>
            <span class="font-mono">{formatCurrency(supplier.purchaseTotal)}</span>
          </div>

          {#if supplier.purchaseCount === 0}
            <button type="button" class="delete-btn" onclick={() => handleDelete(supplier)} aria-label="삭제">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          {:else}
            <span></span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<div class="toast" class:show={toast.show} class:success={toast.type === 'success'} class:error={toast.type === 'error'}>
  {toast.message}
</div>

<style>
  .suppliers-page {
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .suppliers-header h1 {
    font-size: var(--text-2xl);
    font-weight: var(--weight-bold);
    letter-spacing: -0.02em;
  }

  .header-sub {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .add-form {
    display: flex;
    gap: var(--space-3);
    align-items: center;
  }
  .add-form input[type='text'] { flex: 1; }
  .add-form select { width: 140px; }

  .supplier-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .supplier-row {
    display: grid;
    grid-template-columns: 1fr 140px 200px 32px;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-5);
  }

  .supplier-name-cell {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }
  .supplier-name-cell input { flex: 1; }

  .btn-sm {
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
  }

  .supplier-name {
    background: none;
    border: none;
    color: var(--text-primary);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    text-align: left;
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .supplier-name:hover { background: var(--bg-hover); }

  .supplier-stats {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
  }
  .delete-btn:hover { background: var(--negative-muted); color: var(--negative); }

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

  /* ─── 데스크톱 ─── */
  @media (min-width: 1024px) {
    .suppliers-header h1 {
      font-size: var(--text-2xl);
    }
    .supplier-row {
      padding: var(--space-4) var(--space-6);
    }
    .supplier-name,
    .supplier-stats {
      font-size: var(--text-base);
    }
  }
</style>

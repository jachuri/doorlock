<script>
  import { onMount } from 'svelte';
  import { getSuppliers, addSupplier, updateSupplier, deleteSupplier } from '$lib/db.js';
  import { toast, confirmDialog } from '$lib/ui.svelte.js';
  import Icon from '$lib/components/Icon.svelte';
  import Money from '$lib/components/Money.svelte';

  const CATEGORIES = ['광고', '재고', '비품', '기타'];

  let loading = $state(true);
  let suppliers = $state([]);
  let categoryFilter = $state('all');

  let editingId = $state(/** @type {number | null} */ (null));
  let editingName = $state('');

  let newName = $state('');
  let newCategory = $state('기타');
  let adding = $state(false);

  onMount(loadData);

  async function loadData() {
    loading = true;
    const result = await getSuppliers();
    if (Array.isArray(result)) {
      suppliers = result;
    } else {
      suppliers = [];
      toast.show(result?.message || '매입처 목록을 불러오지 못했습니다', 'error');
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
   * @param {{ id: number, name: string, category: string }} supplier
   * @param {string} category
   */
  async function changeCategory(supplier, category) {
    const result = await updateSupplier(supplier.id, { name: supplier.name, category });
    if (!result.success) { toast.show(result.message || '변경 실패', 'error'); return; }
    await loadData();
    toast.show('카테고리 변경 완료');
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
    if (!trimmed) { toast.show('이름을 입력해주세요', 'error'); return; }
    if (trimmed === supplier.name) { cancelEdit(); return; }

    const result = await updateSupplier(supplier.id, { name: trimmed, category: supplier.category });
    if (!result.success) { toast.show(result.message || '수정 실패', 'error'); return; }
    cancelEdit();
    await loadData();
    toast.show(result.merged ? `"${trimmed}"로 병합되었습니다` : '수정 완료');
  }

  /** @param {SubmitEvent} e */
  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    adding = true;
    const result = await addSupplier({ name: trimmed, category: newCategory });
    adding = false;

    if (!result.success) { toast.show(result.message || '추가 실패', 'error'); return; }
    newName = '';
    newCategory = '기타';
    await loadData();
    toast.show('매입처 추가 완료');
  }

  /** @param {{ id: number, name: string }} supplier */
  async function handleDelete(supplier) {
    const ok = await confirmDialog.ask({
      title: '매입처 삭제',
      message: `"${supplier.name}"을(를) 삭제할까요?`,
      confirmLabel: '삭제',
      danger: true,
    });
    if (!ok) return;
    const result = await deleteSupplier(supplier.id);
    if (!result.success) { toast.show(result.message || '삭제 실패', 'error'); return; }
    await loadData();
    toast.show('삭제 완료');
  }
</script>

<svelte:head>
  <title>매입처 관리 · 도어락 장부</title>
</svelte:head>

<div class="page suppliers-page">
  <header class="suppliers-header">
    <a href="/settings" class="btn-icon back-btn" aria-label="설정으로">
      <Icon name="chevron-left" size={24} />
    </a>
    <div>
      <h1 class="page-title">매입처 관리</h1>
      <p class="page-subtitle">이름을 누르면 수정 · 같은 이름은 병합</p>
    </div>
  </header>

  <form class="add-form card" onsubmit={handleAdd}>
    <input type="text" class="input-field" placeholder="새 매입처 이름" bind:value={newName} aria-label="새 매입처 이름" />
    <select class="input-field add-category" bind:value={newCategory} aria-label="카테고리">
      {#each CATEGORIES as c}
        <option value={c}>{c}</option>
      {/each}
    </select>
    <button type="submit" class="btn btn-primary add-btn" disabled={adding || !newName.trim()}>
      <Icon name="plus" size={18} stroke={2.4} /> 추가
    </button>
  </form>

  <div class="chip-scroll" role="group" aria-label="카테고리 필터">
    <button type="button" class="chip" class:active={categoryFilter === 'all'} onclick={() => (categoryFilter = 'all')}>
      전체 <span class="chip-count">{suppliers.length}</span>
    </button>
    {#each CATEGORIES as c}
      <button type="button" class="chip" class:active={categoryFilter === c} onclick={() => (categoryFilter = c)}>
        {c} <span class="chip-count">{categoryCounts.get(c) || 0}</span>
      </button>
    {/each}
  </div>

  {#if loading}
    <div class="supplier-list">
      {#each [0, 1, 2, 3, 4] as _}
        <div class="skeleton" style="height: 72px"></div>
      {/each}
    </div>
  {:else if filteredSuppliers.length === 0}
    <div class="empty-state card">
      <span class="empty-icon"><Icon name="tag" size={26} /></span>
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
                class="input-field input-sm"
                bind:value={editingName}
                aria-label="매입처 이름"
                onkeydown={(e) => { if (e.key === 'Enter') saveEdit(supplier); if (e.key === 'Escape') cancelEdit(); }}
              />
              <button type="button" class="btn btn-primary btn-sm" onclick={() => saveEdit(supplier)}>저장</button>
              <button type="button" class="btn btn-ghost btn-sm" onclick={cancelEdit}>취소</button>
            {:else}
              <button type="button" class="supplier-name" onclick={() => startEdit(supplier)}>
                <span>{supplier.name}</span>
                <Icon name="edit" size={14} class="name-edit-icon" />
              </button>
            {/if}
          </div>

          <div class="supplier-stats">
            <span class="stat-count">{supplier.purchaseCount}건</span>
            <Money value={supplier.purchaseTotal} class="stat-total" />
          </div>

          <select
            class="input-field input-sm category-select"
            value={supplier.category}
            aria-label="{supplier.name} 카테고리"
            onchange={(e) => changeCategory(supplier, /** @type {HTMLSelectElement} */ (e.target).value)}
          >
            {#each CATEGORIES as c}
              <option value={c}>{c}</option>
            {/each}
          </select>

          <div class="delete-cell">
            {#if supplier.purchaseCount === 0}
              <button type="button" class="btn-icon delete-btn" onclick={() => handleDelete(supplier)} aria-label="{supplier.name} 삭제">
                <Icon name="trash" size={18} />
              </button>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .suppliers-page { gap: var(--space-4); }

  .suppliers-header {
    display: flex;
    align-items: flex-start;
    gap: var(--space-1);
    margin-left: calc(var(--space-3) * -1);
  }

  .add-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 96px;
    gap: var(--space-2);
    padding: var(--space-3);
  }
  .add-form input { grid-column: 1 / -1; }
  .add-btn { gap: var(--space-1); }

  .chip-count {
    font-size: var(--text-xs);
    opacity: 0.75;
  }

  .supplier-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* 모바일: 이름+금액 한 줄, 카테고리+삭제 두 번째 줄 */
  .supplier-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'name stats'
      'cat del';
    align-items: center;
    gap: var(--space-2) var(--space-3);
    padding: var(--space-3) var(--space-4);
  }

  .supplier-name-cell {
    grid-area: name;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }
  .supplier-name-cell input { flex: 1; }

  .supplier-name {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    min-height: 40px;
    padding: 0 var(--space-2);
    margin-left: calc(var(--space-2) * -1);
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    text-align: left;
    cursor: pointer;
  }
  .supplier-name span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .supplier-name:hover { background: var(--bg-hover); }
  .supplier-name :global(.name-edit-icon) {
    flex-shrink: 0;
    color: var(--text-tertiary);
  }

  .supplier-stats {
    grid-area: stats;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .stat-count {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }
  .supplier-stats :global(.stat-total) {
    font-size: var(--text-base);
    font-weight: var(--weight-bold);
  }

  .category-select {
    grid-area: cat;
    width: 120px;
  }

  .delete-cell {
    grid-area: del;
    display: flex;
    justify-content: flex-end;
  }
  .delete-btn { color: var(--text-tertiary); }
  .delete-btn:hover { background: var(--negative-muted) !important; color: var(--negative) !important; }

  @media (min-width: 768px) {
    .add-form {
      grid-template-columns: minmax(0, 1fr) 140px auto;
    }
    .add-form input { grid-column: auto; }

    .supplier-row {
      grid-template-columns: minmax(0, 1fr) 140px 200px 44px;
      grid-template-areas: 'name cat stats del';
      padding: var(--space-3) var(--space-5);
    }
    .category-select { width: 100%; }
    .supplier-stats {
      flex-direction: row;
      align-items: baseline;
      justify-content: flex-end;
      gap: var(--space-3);
    }
    .stat-count { font-size: var(--text-sm); }
  }

  @media (min-width: 1024px) {
    .suppliers-header { margin-left: 0; }
    .back-btn { display: none; }
  }
</style>

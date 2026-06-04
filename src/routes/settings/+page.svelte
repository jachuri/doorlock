<script>
  import { exportAllData, importAllData, clearAllData } from '$lib/db.js';

  let toast = $state({ show: false, message: '', type: 'success' });
  let importing = $state(false);

  async function handleBackup() {
    try {
      const data = await exportAllData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `도어락장부_백업_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('백업 파일을 다운로드했습니다');
    } catch {
      showToast('백업 실패', 'error');
    }
  }

  function handleRestoreClick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      importing = true;
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // 간단한 유효성 검사
        if (!data.services || !data.purchases) {
          throw new Error('유효하지 않은 백업 파일');
        }

        if (!confirm(`백업 파일을 복원하면 현재 데이터가 모두 덮어씌워집니다.\n\n매출 ${data.services.length}건, 매입 ${data.purchases.length}건\n\n계속하시겠습니까?`)) {
          return;
        }

        await importAllData(data);
        showToast(`복원 완료 — 매출 ${data.services.length}건, 매입 ${data.purchases.length}건`);
      } catch (err) {
        showToast('복원 실패: ' + err.message, 'error');
      } finally {
        importing = false;
      }
    };
    input.click();
  }

  async function handleClearData() {
    const confirmed = confirm('모든 데이터를 삭제합니다.\n이 작업은 되돌릴 수 없습니다.\n\n정말 삭제하시겠습니까?');
    if (!confirmed) return;

    const doubleCheck = confirm('정말로 삭제하시겠습니까?\n\n삭제 전 백업을 권장합니다.');
    if (!doubleCheck) return;

    try {
      await clearAllData();
      showToast('모든 데이터가 삭제되었습니다');
    } catch {
      showToast('삭제 실패', 'error');
    }
  }

  function showToast(message, type = 'success') {
    toast = { show: true, message, type };
    setTimeout(() => { toast = { ...toast, show: false }; }, 2500);
  }
</script>

<svelte:head>
  <title>설정 — 도어락 장부</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1>설정</h1>
  </header>

  <!-- 데이터 관리 -->
  <section class="section">
    <h2 class="section-title">데이터 관리</h2>

    <div class="setting-list">
      <button class="setting-item" onclick={handleBackup}>
        <div class="setting-info">
          <span class="setting-name">백업 다운로드</span>
          <span class="setting-desc">전체 데이터를 JSON 파일로 저장</span>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>

      <button class="setting-item" onclick={handleRestoreClick} disabled={importing}>
        <div class="setting-info">
          <span class="setting-name">{importing ? '복원 중...' : '백업에서 복원'}</span>
          <span class="setting-desc">JSON 파일에서 데이터 복원 (기존 데이터 덮어쓰기)</span>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </button>

      <button class="setting-item danger" onclick={handleClearData}>
        <div class="setting-info">
          <span class="setting-name">데이터 초기화</span>
          <span class="setting-desc">모든 매출/매입 데이터 삭제</span>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
      </button>
    </div>
  </section>

  <!-- 정보 -->
  <section class="section">
    <h2 class="section-title">정보</h2>
    <div class="info-card card">
      <div class="info-row">
        <span>버전</span>
        <span class="text-secondary">1.0.0</span>
      </div>
      <div class="info-row">
        <span>저장소</span>
        <span class="text-secondary">브라우저 로컬 (IndexedDB)</span>
      </div>
      <div class="info-row">
        <span>서버 비용</span>
        <span class="text-positive">무료</span>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="tip-card card">
      <p class="tip-title">💡 데이터 보관 팁</p>
      <p class="tip-text">
        브라우저 캐시를 삭제하면 데이터가 사라집니다.
        주기적으로 <strong>백업 다운로드</strong>를 해두세요.
        구글 드라이브에 백업 파일을 보관하면 안전합니다.
      </p>
    </div>
  </section>
</div>

<div class="toast" class:show={toast.show} class:success={toast.type === 'success'} class:error={toast.type === 'error'}>
  {toast.message}
</div>

<style>
  .page {
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .page-header h1 {
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    letter-spacing: -0.02em;
    padding-top: var(--space-2);
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .section-title {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .setting-list {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    background: var(--bg-raised);
    border: none;
    border-bottom: 1px solid var(--border-subtle);
    color: var(--text-primary);
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: background var(--duration-fast) var(--ease-out);
  }
  .setting-item:last-child {
    border-bottom: none;
  }
  .setting-item:hover {
    background: var(--bg-hover);
  }
  .setting-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .setting-item.danger {
    color: var(--negative);
  }
  .setting-item.danger .setting-desc {
    color: var(--negative);
    opacity: 0.6;
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .setting-name {
    font-size: var(--text-base);
    font-weight: var(--weight-medium);
  }

  .setting-desc {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }

  .info-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-sm);
  }

  .tip-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    background: var(--warning-muted);
    border-color: transparent;
  }

  .tip-title {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
  }

  .tip-text {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.6;
  }
  .tip-text strong {
    color: var(--text-primary);
  }

  .text-positive { color: var(--positive); }
</style>

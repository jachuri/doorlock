<script>
  import { exportAllData, importAllData, clearAllData } from '$lib/db.js';
  import { toast, confirmDialog, theme } from '$lib/ui.svelte.js';
  import Icon from '$lib/components/Icon.svelte';

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

      toast.show('백업 파일을 다운로드했습니다');
    } catch {
      toast.show('백업 실패', 'error');
    }
  }

  function handleRestoreClick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = /** @type {HTMLInputElement} */ (e.target).files?.[0];
      if (!file) return;

      importing = true;
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // 간단한 유효성 검사
        if (!data.services || !data.purchases) {
          throw new Error('유효하지 않은 백업 파일');
        }

        const ok = await confirmDialog.ask({
          title: '백업에서 복원',
          message: `현재 데이터가 모두 백업 파일 내용으로 덮어씌워집니다.\n\n매출 ${data.services.length}건 · 매입 ${data.purchases.length}건`,
          confirmLabel: '복원',
          danger: true,
        });
        if (!ok) return;

        await importAllData(data);
        toast.show(`복원 완료 — 매출 ${data.services.length}건, 매입 ${data.purchases.length}건`);
      } catch (err) {
        toast.show('복원 실패: ' + /** @type {Error} */ (err).message, 'error');
      } finally {
        importing = false;
      }
    };
    input.click();
  }

  async function handleClearData() {
    const first = await confirmDialog.ask({
      title: '데이터 초기화',
      message: '모든 매출·매입 데이터를 삭제합니다.\n이 작업은 되돌릴 수 없습니다.',
      confirmLabel: '계속',
      danger: true,
    });
    if (!first) return;

    const second = await confirmDialog.ask({
      title: '정말 삭제할까요?',
      message: '삭제 전에 백업 다운로드를 권장합니다.',
      confirmLabel: '전체 삭제',
      danger: true,
    });
    if (!second) return;

    try {
      await clearAllData();
      toast.show('모든 데이터가 삭제되었습니다');
    } catch {
      toast.show('삭제 실패', 'error');
    }
  }
</script>

<svelte:head>
  <title>설정 — 도어락 장부</title>
</svelte:head>

<div class="page settings-page">
  <header class="page-header">
    <h1 class="page-title">설정</h1>
  </header>

  <div class="settings-grid">
    <div class="col">
      <section class="section">
        <h2 class="eyebrow">화면</h2>
        <div class="card theme-card">
          <div class="theme-info">
            <span class="setting-name">테마</span>
            <span class="setting-desc">야외에선 라이트가 잘 보여요</span>
          </div>
          <div class="segmented" role="radiogroup" aria-label="테마">
            <button role="radio" aria-checked={theme.value === 'dark'} onclick={() => theme.set('dark')}>
              <Icon name="moon" size={16} /> 다크
            </button>
            <button role="radio" aria-checked={theme.value === 'light'} onclick={() => theme.set('light')}>
              <Icon name="sun" size={16} /> 라이트
            </button>
          </div>
        </div>
      </section>

      <section class="section">
        <h2 class="eyebrow">관리</h2>
        <div class="setting-list">
          <a class="setting-item" href="/suppliers">
            <span class="setting-icon"><Icon name="tag" size={20} /></span>
            <div class="setting-info">
              <span class="setting-name">매입처 관리</span>
              <span class="setting-desc">이름 오타 병합 · 카테고리 분류</span>
            </div>
            <Icon name="chevron-right" size={18} class="setting-chevron" />
          </a>
        </div>
      </section>

      <section class="section">
        <h2 class="eyebrow">데이터</h2>
        <div class="setting-list">
          <button class="setting-item" onclick={handleBackup}>
            <span class="setting-icon"><Icon name="download" size={20} /></span>
            <div class="setting-info">
              <span class="setting-name">백업 다운로드</span>
              <span class="setting-desc">전체 데이터를 JSON 파일로 저장</span>
            </div>
            <Icon name="chevron-right" size={18} class="setting-chevron" />
          </button>

          <button class="setting-item" onclick={handleRestoreClick} disabled={importing}>
            <span class="setting-icon"><Icon name="upload" size={20} /></span>
            <div class="setting-info">
              <span class="setting-name">{importing ? '복원 중...' : '백업에서 복원'}</span>
              <span class="setting-desc">JSON 파일로 덮어쓰기</span>
            </div>
            <Icon name="chevron-right" size={18} class="setting-chevron" />
          </button>

          <button class="setting-item danger" onclick={handleClearData}>
            <span class="setting-icon"><Icon name="trash" size={20} /></span>
            <div class="setting-info">
              <span class="setting-name">데이터 초기화</span>
              <span class="setting-desc">모든 매출·매입 데이터 삭제</span>
            </div>
            <Icon name="chevron-right" size={18} class="setting-chevron" />
          </button>
        </div>
      </section>
    </div>

    <div class="col">
      <section class="section">
        <h2 class="eyebrow">정보</h2>
        <dl class="card info-card">
          <div class="info-row">
            <dt>버전</dt>
            <dd>2.0.0</dd>
          </div>
          <div class="info-row">
            <dt>저장소</dt>
            <dd>서버 DB (Neon Postgres)</dd>
          </div>
          <div class="info-row">
            <dt>서버 비용</dt>
            <dd class="text-positive">무료</dd>
          </div>
        </dl>
      </section>

      <aside class="tip-card">
        <span class="tip-icon"><Icon name="info" size={20} /></span>
        <p class="tip-text">
          데이터는 서버에 저장되어 PC·모바일 어디서든 같은 내용을 볼 수 있습니다.
          만약을 대비해 주기적으로 <strong>백업 다운로드</strong>를 권장합니다.
        </p>
      </aside>
    </div>
  </div>
</div>

<style>
  .settings-grid,
  .col {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .section { gap: var(--space-2); }
  .eyebrow { padding-left: var(--space-1); }

  .theme-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-4);
  }
  .theme-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .theme-card .segmented button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 0 var(--space-3);
  }

  .setting-list {
    display: flex;
    flex-direction: column;
    background: var(--bg-raised);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .setting-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 64px;
    padding: var(--space-3) var(--space-4);
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border-subtle);
    color: var(--text-primary);
    text-decoration: none;
    cursor: pointer;
    text-align: left;
    transition: background var(--duration-fast) var(--ease-out);
  }
  .setting-item:last-child { border-bottom: none; }
  .setting-item:hover { background: var(--bg-hover); }
  .setting-item:disabled { opacity: 0.5; cursor: not-allowed; }

  .setting-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    color: var(--text-secondary);
  }

  .setting-item.danger { color: var(--negative); }
  .setting-item.danger .setting-icon {
    background: var(--negative-muted);
    color: var(--negative);
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-width: 0;
  }

  .setting-name {
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
  }

  .setting-desc {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .setting-item :global(.setting-chevron) {
    color: var(--text-tertiary);
    flex-shrink: 0;
  }

  .info-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-sm);
  }
  .info-row dt { color: var(--text-secondary); }
  .info-row dd { font-weight: var(--weight-medium); }

  .tip-card {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--brand-muted);
  }

  .tip-icon {
    color: var(--brand-text);
    flex-shrink: 0;
    padding-top: 1px;
  }

  .tip-text {
    font-size: var(--text-sm);
    color: var(--text-secondary);
    line-height: 1.6;
  }
  .tip-text strong { color: var(--text-primary); }

  @media (min-width: 1024px) {
    .settings-page { max-width: 960px !important; }
    .settings-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      align-items: start;
    }
  }
</style>

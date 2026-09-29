<script>
  import { onMount, tick } from 'svelte';
  import Icon from './Icon.svelte';

  /**
   * 모바일은 아래에서 올라오는 바텀시트, 데스크톱은 가운데 다이얼로그.
   * Esc/배경 탭으로 닫힘, 열릴 때 포커스를 안으로 옮기고 닫히면 원래 자리로 되돌린다.
   */
  let { title, onclose, children, footer = undefined, size = 'md' } = $props();

  /** @type {HTMLDivElement | undefined} */
  let panel = $state();
  /** @type {Element | null} */
  let previouslyFocused = null;

  onMount(() => {
    previouslyFocused = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    tick().then(() => panel?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  });

  /** @param {KeyboardEvent} e */
  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onclose();
      return;
    }
    if (e.key !== 'Tab' || !panel) return;
    const focusables = /** @type {HTMLElement[]} */ ([
      ...panel.querySelectorAll('button:not([disabled]), input:not([disabled]), select, textarea, a[href], [tabindex]:not([tabindex="-1"])'),
    ]);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<!-- 배경 탭으로 닫기 (키보드는 Esc 처리가 svelte:window에 있음) -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" onclick={onclose} role="presentation">
  <div
    class="sheet sheet-{size}"
    bind:this={panel}
    onclick={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
    aria-label={title}
    tabindex="-1"
  >
    <div class="grabber" aria-hidden="true"></div>
    <header class="sheet-header">
      <h2>{title}</h2>
      <button type="button" class="btn-icon" onclick={onclose} aria-label="닫기">
        <Icon name="x" size={22} />
      </button>
    </header>
    <div class="sheet-body">
      {@render children()}
    </div>
    {#if footer}
      <footer class="sheet-footer">
        {@render footer()}
      </footer>
    {/if}
  </div>
</div>

<style>
  .sheet {
    width: 100%;
    max-width: var(--max-width);
    max-height: 92dvh;
    display: flex;
    flex-direction: column;
    background: var(--bg-raised);
    border: 1px solid var(--border-subtle);
    border-bottom: none;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    box-shadow: var(--shadow-lg);
    animation: sheet-in var(--duration-slow) var(--ease-out);
    outline: none;
  }

  .grabber {
    width: 40px;
    height: 4px;
    margin: var(--space-2) auto 0;
    border-radius: var(--radius-full);
    background: var(--border-strong);
  }

  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-2) var(--space-2) var(--space-5);
  }
  .sheet-header h2 {
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    letter-spacing: -0.02em;
  }

  .sheet-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2) var(--space-5) var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .sheet-footer {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-5) calc(var(--space-4) + var(--safe-bottom));
    border-top: 1px solid var(--border-subtle);
  }

  @media (min-width: 768px) {
    .sheet {
      border-bottom: 1px solid var(--border-subtle);
      border-radius: var(--radius-xl);
      max-height: 86vh;
      animation: pop-in var(--duration-normal) var(--ease-out);
    }
    .sheet-sm { max-width: 400px; }
    .grabber { display: none; }
    .sheet-header { padding-top: var(--space-3); }
    .sheet-footer { padding-bottom: var(--space-4); }
  }
</style>

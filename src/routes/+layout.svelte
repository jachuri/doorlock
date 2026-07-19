<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { viewport } from '$lib/viewport.svelte.js';

  let { children } = $props();

  const navItems = [
    { href: '/', label: '대시보드', icon: 'dashboard' },
    { href: '/input', label: '매출입력', icon: 'add' },
    { href: '/purchase', label: '매입', icon: 'purchase' },
    { href: '/history', label: '내역', icon: 'history' },
    { href: '/settings', label: '설정', icon: 'settings' },
  ];

  // 사이드바(데스크톱)에만 노출 — 하단 네비(모바일)는 기존 5개 항목 그대로 유지
  // 대시보드가 곧 리포트 화면이므로 별도 "리포트" 메뉴는 없음
  const desktopNavItems = [
    ...navItems.slice(0, 3),
    { href: '/suppliers', label: '매입처', icon: 'suppliers' },
    ...navItems.slice(3),
  ];

  let isLoginPage = $derived($page.url.pathname === '/login');

  /**
   * @param {string} href
   * @param {string} pathname
   */
  function isActive(href, pathname) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }
</script>

{#snippet navIcon(/** @type {string} */ icon)}
  {#if icon === 'dashboard'}
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  {:else if icon === 'add'}
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  {:else if icon === 'purchase'}
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  {:else if icon === 'history'}
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  {:else if icon === 'settings'}
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  {:else if icon === 'suppliers'}
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.59 13.41L11 3.83A2 2 0 009.59 3H4a1 1 0 00-1 1v5.59a2 2 0 00.59 1.41l9.58 9.58a2 2 0 002.82 0l4.6-4.6a2 2 0 000-2.82z"/>
      <circle cx="7.5" cy="7.5" r="1.3"/>
    </svg>
  {/if}
{/snippet}

{#if isLoginPage}
  {@render children()}
{:else if viewport.isDesktop}
  <div class="app-shell-desktop">
    <aside class="sidebar" aria-label="메인 네비게이션">
      <div class="sidebar-brand">도어락 장부</div>
      <nav class="sidebar-nav">
        {#each desktopNavItems as item}
          <a
            href={item.href}
            class="sidebar-nav-item"
            class:active={isActive(item.href, $page.url.pathname)}
          >
            {@render navIcon(item.icon)}
            <span>{item.label}</span>
          </a>
        {/each}
      </nav>
    </aside>
    <main class="desktop-main">
      {@render children()}
    </main>
  </div>
{:else}
  <div class="app-shell">
    <main class="app-main">
      {@render children()}
    </main>

    <nav class="bottom-nav" aria-label="메인 네비게이션">
      {#each navItems as item}
        <a
          href={item.href}
          class="nav-item"
          class:active={isActive(item.href, $page.url.pathname)}
          aria-label={item.label}
        >
          {@render navIcon(item.icon)}
          <span>{item.label}</span>
        </a>
      {/each}
    </nav>
  </div>
{/if}

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    max-width: var(--max-width);
    margin: 0 auto;
  }

  .app-main {
    flex: 1;
    padding-bottom: var(--nav-height);
  }

  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: var(--max-width);
    height: var(--nav-height);
    display: flex;
    align-items: center;
    justify-content: space-around;
    background: var(--bg-raised);
    border-top: 1px solid var(--border-subtle);
    z-index: 50;
    padding-bottom: env(safe-area-inset-bottom);
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: var(--space-2) var(--space-3);
    color: var(--text-tertiary);
    text-decoration: none;
    font-size: 10px;
    font-weight: var(--weight-medium);
    transition: color var(--duration-fast) var(--ease-out);
    -webkit-tap-highlight-color: transparent;
  }

  .nav-item:hover,
  .nav-item.active {
    color: var(--text-primary);
  }

  @media (min-width: 768px) {
    .bottom-nav {
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    }
  }

  /* ─── 데스크톱 셸 ─── */

  .app-shell-desktop {
    display: flex;
    min-height: 100dvh;
  }

  .sidebar {
    width: var(--sidebar-width);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-6) var(--space-4);
    background: var(--bg-raised);
    border-right: 1px solid var(--border-subtle);
    position: sticky;
    top: 0;
    height: 100dvh;
  }

  .sidebar-brand {
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-lg);
    font-weight: var(--weight-bold);
    letter-spacing: -0.02em;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .sidebar-nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    text-decoration: none;
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    transition: all var(--duration-fast) var(--ease-out);
  }
  .sidebar-nav-item:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .sidebar-nav-item.active {
    background: var(--accent-muted);
    color: var(--accent-text);
  }

  .desktop-main {
    flex: 1;
    min-width: 0;
    padding: var(--space-10);
    overflow-x: hidden;
  }

  /* 개별 페이지는 그대로 두고, 그 루트 컨테이너(.page)만 데스크톱 폭에 맞춰 확장 */
  .desktop-main :global(.page) {
    max-width: var(--max-width-desktop);
    margin: 0 auto;
  }
</style>

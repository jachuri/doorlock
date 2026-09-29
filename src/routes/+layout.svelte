<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { viewport } from '$lib/viewport.svelte.js';
  import { theme } from '$lib/ui.svelte.js';
  import Icon from '$lib/components/Icon.svelte';
  import Toaster from '$lib/components/Toaster.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

  let { children } = $props();

  // 모바일 하단 네비 — 가장 자주 쓰는 "매출 입력"을 엄지가 닿는 가운데에 강조
  const navItems = [
    { href: '/', label: '홈', icon: 'home' },
    { href: '/history', label: '내역', icon: 'list' },
    { href: '/input', label: '매출', icon: 'plus', primary: true },
    { href: '/purchase', label: '매입', icon: 'bag' },
    { href: '/settings', label: '설정', icon: 'settings' },
  ];

  // 사이드바(데스크톱) — 대시보드가 곧 리포트 화면이므로 별도 "리포트" 메뉴는 없음
  const desktopNavItems = [
    { href: '/', label: '대시보드', icon: 'grid' },
    { href: '/history', label: '내역', icon: 'list' },
    { href: '/input', label: '매출 입력', icon: 'plus-circle' },
    { href: '/purchase', label: '매입 입력', icon: 'bag' },
    { href: '/suppliers', label: '매입처', icon: 'tag' },
    { href: '/settings', label: '설정', icon: 'settings' },
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

{#if isLoginPage}
  {@render children()}
{:else if viewport.isDesktop}
  <div class="app-shell-desktop">
    <aside class="sidebar" aria-label="메인 네비게이션">
      <a href="/" class="sidebar-brand">
        <span class="brand-mark"><Icon name="key" size={18} stroke={2.2} /></span>
        <span>도어락 장부</span>
      </a>
      <nav class="sidebar-nav">
        {#each desktopNavItems as item}
          <a
            href={item.href}
            class="sidebar-nav-item"
            class:active={isActive(item.href, $page.url.pathname)}
            aria-current={isActive(item.href, $page.url.pathname) ? 'page' : undefined}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </a>
        {/each}
      </nav>
      <div class="sidebar-foot">
        <button
          type="button"
          class="theme-toggle"
          onclick={() => theme.set(theme.value === 'dark' ? 'light' : 'dark')}
          aria-label={theme.value === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
        >
          <Icon name={theme.value === 'dark' ? 'sun' : 'moon'} size={18} />
          <span>{theme.value === 'dark' ? '라이트 모드' : '다크 모드'}</span>
        </button>
      </div>
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
        {@const active = isActive(item.href, $page.url.pathname)}
        <a
          href={item.href}
          class="nav-item"
          class:active
          class:primary={item.primary}
          aria-current={active ? 'page' : undefined}
        >
          {#if item.primary}
            <span class="nav-fab"><Icon name={item.icon} size={24} stroke={2.4} /></span>
          {:else}
            <Icon name={item.icon} size={23} stroke={active ? 2.2 : 1.8} />
          {/if}
          <span class="nav-label">{item.label}</span>
        </a>
      {/each}
    </nav>
  </div>
{/if}

<Toaster />
<ConfirmDialog />

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
    padding-bottom: calc(var(--nav-height) + var(--safe-bottom));
  }

  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: var(--max-width);
    height: calc(var(--nav-height) + var(--safe-bottom));
    padding-bottom: var(--safe-bottom);
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    align-items: stretch;
    background: color-mix(in srgb, var(--bg-raised) 92%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--border-subtle);
    z-index: 50;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    color: var(--text-tertiary);
    text-decoration: none;
    transition: color var(--duration-fast) var(--ease-out);
  }
  .nav-item:hover,
  .nav-item.active {
    color: var(--text-primary);
  }

  .nav-label {
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    line-height: 1;
  }
  .nav-item.active .nav-label { font-weight: var(--weight-bold); }

  .nav-fab {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 34px;
    border-radius: var(--radius-full);
    background: var(--brand);
    color: var(--on-brand);
    transition: transform var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out);
  }
  .nav-item.primary:active .nav-fab { transform: scale(0.94); }
  .nav-item.primary.active .nav-fab { background: var(--brand-hover); }
  .nav-item.primary .nav-label { color: var(--text-primary); }

  @media (min-width: 520px) {
    .bottom-nav {
      border-left: 1px solid var(--border-subtle);
      border-right: 1px solid var(--border-subtle);
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
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-lg);
    font-weight: var(--weight-heavy);
    letter-spacing: -0.03em;
    text-decoration: none;
  }

  .brand-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: var(--radius-md);
    background: var(--brand);
    color: var(--on-brand);
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sidebar-nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 44px;
    padding: 0 var(--space-3);
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
    font-weight: var(--weight-semibold);
  }

  .sidebar-foot {
    margin-top: auto;
  }

  .theme-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    min-height: 44px;
    padding: 0 var(--space-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    cursor: pointer;
  }
  .theme-toggle:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .desktop-main {
    flex: 1;
    min-width: 0;
    overflow-x: hidden;
  }

  .desktop-main :global(.page) {
    max-width: var(--max-width-desktop);
    margin: 0 auto;
  }
</style>

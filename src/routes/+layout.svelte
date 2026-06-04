<script>
  import '../app.css';
  import { page } from '$app/stores';

  let { children } = $props();

  const navItems = [
    { href: '/', label: '대시보드', icon: 'dashboard' },
    { href: '/input', label: '매출입력', icon: 'add' },
    { href: '/purchase', label: '매입', icon: 'purchase' },
    { href: '/history', label: '내역', icon: 'history' },
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
          {#if item.icon === 'dashboard'}
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          {:else if item.icon === 'add'}
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          {:else if item.icon === 'purchase'}
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          {:else if item.icon === 'history'}
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          {:else if item.icon === 'settings'}
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          {/if}
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
</style>

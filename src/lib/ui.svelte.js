import { browser } from '$app/environment';

/**
 * 전역 UI 상태 — 토스트, 확인창, 테마.
 * 페이지마다 복제되던 토스트/confirm() 로직을 한곳으로 모은다.
 * 렌더링은 +layout.svelte의 <Toaster />, <ConfirmDialog />가 담당.
 */

// ─── 토스트 ───

class ToastState {
  /** @type {{ id: number, message: string, type: 'success' | 'error' | 'info' } | null} */
  current = $state(null);
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #timer;
  #seq = 0;

  /**
   * @param {string} message
   * @param {'success' | 'error' | 'info'} [type]
   */
  show(message, type = 'success') {
    clearTimeout(this.#timer);
    this.current = { id: ++this.#seq, message, type };
    this.#timer = setTimeout(() => (this.current = null), type === 'error' ? 3200 : 2200);
  }

  dismiss() {
    clearTimeout(this.#timer);
    this.current = null;
  }
}

export const toast = new ToastState();

// ─── 확인창 (window.confirm 대체) ───

/**
 * @typedef {{ title: string, message?: string, confirmLabel?: string, cancelLabel?: string, danger?: boolean }} ConfirmOptions
 */

class ConfirmState {
  /** @type {(ConfirmOptions & { resolve: (v: boolean) => void }) | null} */
  current = $state(null);

  /**
   * @param {ConfirmOptions} opts
   * @returns {Promise<boolean>}
   */
  ask(opts) {
    this.current?.resolve(false);
    return new Promise((resolve) => {
      this.current = { confirmLabel: '확인', cancelLabel: '취소', ...opts, resolve };
    });
  }

  /** @param {boolean} value */
  settle(value) {
    const c = this.current;
    this.current = null;
    c?.resolve(value);
  }
}

export const confirmDialog = new ConfirmState();

// ─── 테마 ───

const THEME_KEY = 'doorlock-theme';

class ThemeState {
  /** @type {'dark' | 'light'} */
  value = $state('dark');

  constructor() {
    if (!browser) return;
    this.value = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  }

  /** @param {'dark' | 'light'} next */
  set(next) {
    this.value = next;
    if (!browser) return;
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#f3f5f9' : '#0b1019');
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  }
}

export const theme = new ThemeState();

import { browser } from '$app/environment';

/** PC/모바일 판별은 기기 종류가 아니라 뷰포트 폭(1024px) 기준 */
class Viewport {
  isDesktop = $state(false);

  constructor() {
    if (!browser) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    this.isDesktop = mq.matches;
    mq.addEventListener('change', (e) => {
      this.isDesktop = e.matches;
    });
  }
}

export const viewport = new Viewport();

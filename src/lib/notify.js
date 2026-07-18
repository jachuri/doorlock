/**
 * 매출/매입 저장 후 10초 뒤 이번달 요약을 브라우저 알림으로 표시
 */

import { getServicesByDateRange, getPurchasesByDateRange } from './db.js';
import { formatDate } from './utils.js';

const DELAY_MS = 10000;

/** 알림 권한이 아직 결정되지 않았으면 요청한다 (사용자 제스처 안에서 호출할 것) */
export function ensureNotificationPermission() {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/** 저장 10초 후 이번달 매출/매입/순수익 요약 알림을 예약한다 */
export function scheduleSaveNotification() {
  if (typeof Notification === 'undefined') return;

  setTimeout(async () => {
    if (Notification.permission !== 'granted') return;

    try {
      const now = new Date();
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const end = formatDate(now);

      const [services, purchasesList] = await Promise.all([
        getServicesByDateRange(start, end),
        getPurchasesByDateRange(start, end)
      ]);

      const sales = services.reduce((sum, s) => sum + s.amount, 0);
      const parts = services.reduce((sum, s) => sum + (s.partsCost || 0), 0);
      const purchaseTotal = purchasesList.reduce((sum, p) => sum + p.amount, 0);
      const netProfit = sales - parts - purchaseTotal;
      const won = (n) => `${n.toLocaleString('ko-KR')}원`;

      new Notification('저장 확인', {
        body: `이번달 매출 ${won(sales)} · 매입 ${won(purchaseTotal)} · 순수익 ${won(netProfit)}`,
        icon: '/icon-192.png',
        tag: 'doorlock-save-summary'
      });
    } catch {
      // 알림은 부가 기능 — 실패해도 무시
    }
  }, DELAY_MS);
}

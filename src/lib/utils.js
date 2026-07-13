/**
 * 숫자를 원화 포맷으로 변환
 * @param {number} amount
 * @returns {string} 예: "250,000원"
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '0원';
  const formatted = Math.abs(amount).toLocaleString('ko-KR');
  return amount < 0 ? `-${formatted}원` : `${formatted}원`;
}

/**
 * 숫자를 콤마 포맷으로 변환 (원 없이)
 * @param {number} amount
 * @returns {string}
 */
export function formatNumber(amount) {
  if (amount == null || isNaN(amount)) return '0';
  return amount.toLocaleString('ko-KR');
}

/**
 * 콤마 포맷 문자열을 숫자로 변환
 * @param {string} str
 * @returns {number}
 */
export function parseAmount(str) {
  if (!str) return 0;
  return parseInt(str.replace(/[^0-9-]/g, ''), 10) || 0;
}

/**
 * 날짜를 'YYYY-MM-DD' 포맷으로
 * @param {Date} [date]
 * @returns {string}
 */
export function formatDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 날짜를 표시용 포맷으로
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {string} 예: "6월 5일 (목)"
 */
export function formatDateDisplay(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const day = days[date.getDay()];
  return `${m}월 ${d}일 (${day})`;
}

/**
 * 날짜를 간단 표시용
 * @param {string} dateStr
 * @returns {string} 예: "6/5"
 */
export function formatDateShort(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 현재 시간을 'HH:MM' 포맷으로
 * @param {Date} [date]
 * @returns {string}
 */
export function formatTime(date = new Date()) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * 'YYYY년 MM월' 포맷
 * @param {number} year
 * @param {number} month - 1~12
 * @returns {string}
 */
export function formatMonth(year, month) {
  return `${year}년 ${month}월`;
}

/**
 * 퍼센트 포맷
 * @param {number} value
 * @returns {string}
 */
export function formatPercent(value) {
  if (value == null || isNaN(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
}

/**
 * 이번 달 시작~오늘 범위 반환
 * @returns {{ start: string, end: string }}
 */
export function getThisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    start: formatDate(start),
    end: formatDate(now)
  };
}

/**
 * 이번 주 시작(월)~오늘 범위 반환
 * @returns {{ start: string, end: string }}
 */
export function getThisWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // 월요일 기준
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  return {
    start: formatDate(start),
    end: formatDate(now)
  };
}

/**
 * 지난 달 1일~말일 범위 반환
 * @returns {{ start: string, end: string }}
 */
export function getLastMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    start: formatDate(start),
    end: formatDate(end)
  };
}

/**
 * 입력값에서 숫자만 남기고 콤마 포맷팅
 * @param {string} value
 * @returns {string}
 */
export function formatAmountInput(value) {
  const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
  if (isNaN(num) || num === 0) return '';
  return num.toLocaleString('ko-KR');
}

/**
 * 좁은 공간(달력 칸 등)에 넣을 축약 금액 표기
 * @param {number} amount
 * @returns {string} 예: 125000 -> "12.5만", 320 -> "320"
 */
export function formatCompactAmount(amount) {
  if (amount == null || isNaN(amount)) return '0';
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  if (abs >= 10000) {
    const man = abs / 10000;
    return `${sign}${man.toFixed(man >= 100 ? 0 : 1)}만`;
  }
  return `${sign}${abs.toLocaleString('ko-KR')}`;
}

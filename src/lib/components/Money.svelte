<script>
  import { formatNumber } from '$lib/utils.js';

  /**
   * 금액 표시: 숫자는 크게, "원"은 작게 붙여 줄바꿈 없이 한 덩어리로.
   * tone: 'auto'는 부호에 따라 순수익 녹/적, 그 외는 고정 색.
   */
  let { value = 0, sign = false, tone = 'none', unit = true, class: className = '' } = $props();

  let negative = $derived(value < 0);
  let text = $derived(formatNumber(Math.abs(Math.round(value || 0))));
  let prefix = $derived(negative ? '-' : sign && value > 0 ? '+' : '');
  let toneClass = $derived(
    tone === 'auto' ? (negative ? 'negative' : 'positive') : tone === 'none' ? '' : tone
  );
</script>

<span class="num money {toneClass} {className}">{prefix}{text}{#if unit}<span class="won">원</span>{/if}</span>

<style>
  .money { white-space: nowrap; }
  .sales { color: var(--accent-text); }
  .purchase { color: var(--text-tertiary); }
  .muted { color: var(--text-secondary); }
</style>

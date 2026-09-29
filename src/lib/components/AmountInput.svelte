<script>
  import { formatAmountInput, parseAmount } from '$lib/utils.js';

  /**
   * 금액 입력 — 콤마 자동 포맷, 큰 숫자, 빠른 더하기 버튼(선택).
   * value는 "150,000" 같은 포맷 문자열로 바인딩한다 (기존 페이지 로직과 동일).
   */
  let {
    id,
    value = $bindable(''),
    label = '금액',
    size = 'md',
    quick = [],
  } = $props();

  /** @param {Event & { currentTarget: HTMLInputElement }} e */
  function onInput(e) {
    value = formatAmountInput(e.currentTarget.value);
  }

  /** @param {number} n */
  function add(n) {
    value = formatAmountInput(String(parseAmount(value) + n));
  }

  /** @param {number} n */
  function quickLabel(n) {
    return n >= 10000 ? `+${n / 10000}만` : `+${n.toLocaleString('ko-KR')}`;
  }
</script>

<div class="amount-input size-{size}">
  <label for={id} class="field-label">{label}</label>
  <div class="amount-box">
    <input
      {id}
      type="text"
      inputmode="numeric"
      placeholder="0"
      {value}
      oninput={onInput}
      autocomplete="off"
      enterkeyhint="done"
    />
    <span class="unit">원</span>
  </div>
  {#if quick.length}
    <div class="quick">
      {#each quick as n}
        <button type="button" class="quick-btn" onclick={() => add(n)}>{quickLabel(n)}</button>
      {/each}
      <button type="button" class="quick-btn clear" onclick={() => (value = '')} disabled={!value}>지우기</button>
    </div>
  {/if}
</div>

<style>
  .amount-input {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .amount-box {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    padding: 0 var(--space-4);
    min-height: 56px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    transition: border-color var(--duration-fast) var(--ease-out), background var(--duration-fast);
    cursor: text;
  }
  .amount-box:hover { border-color: var(--border-strong); }
  .amount-box:focus-within {
    border-color: var(--brand);
    background: var(--bg-raised);
  }

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    outline: none;
    text-align: right;
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: var(--text-primary);
    padding: var(--space-3) 0;
  }
  input::placeholder { color: var(--text-tertiary); font-weight: var(--weight-semibold); }

  .unit {
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    color: var(--text-tertiary);
  }

  .size-lg .amount-box {
    min-height: 76px;
    border-radius: var(--radius-lg);
  }
  .size-lg input { font-size: 2.125rem; font-weight: var(--weight-heavy); letter-spacing: -0.03em; }
  .size-lg .unit { font-size: var(--text-lg); }

  .quick {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .quick-btn {
    min-height: 40px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-out);
  }
  .quick-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .quick-btn:active:not(:disabled) { transform: scale(0.96); }
  .quick-btn.clear { color: var(--text-tertiary); }
  .quick-btn:disabled { opacity: 0.4; cursor: default; }
</style>

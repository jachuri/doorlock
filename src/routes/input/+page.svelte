<script>
  import { addService } from '$lib/db.js';
  import { formatDate, formatTime, formatAmountInput, parseAmount } from '$lib/utils.js';

  const PAYMENT_METHODS = ['현금', '카드', '계좌이체'];

  let date = $state(formatDate());
  let time = $state(formatTime());
  let paymentMethod = $state('카드');
  let amountStr = $state('');
  let memo = $state('');

  let saving = $state(false);
  let toast = $state({ show: false, message: '', type: 'success' });

  let amount = $derived(parseAmount(amountStr));

  function onAmountInput(e) {
    const raw = e.target.value;
    amountStr = formatAmountInput(raw);
  }

  async function handleSave() {
    if (amount <= 0) {
      showToast('매출액을 입력해주세요', 'error');
      return;
    }

    saving = true;
    try {
      await addService({
        date,
        time,
        paymentMethod,
        amount,
        partsCost: 0,
        memo: memo.trim() || ''
      });

      showToast('저장 완료', 'success');
      resetForm();
    } catch (err) {
      showToast('저장에 실패했습니다', 'error');
    } finally {
      saving = false;
    }
  }

  function resetForm() {
    const now = new Date();
    date = formatDate(now);
    time = formatTime(now);
    paymentMethod = '카드';
    amountStr = '';
    memo = '';
  }

  function showToast(message, type = 'success') {
    toast = { show: true, message, type };
    setTimeout(() => {
      toast = { ...toast, show: false };
    }, 2000);
  }
</script>

<svelte:head>
  <title>매출 입력 — 도어락 장부</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <h1>매출 입력</h1>
  </header>

  <form class="form" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
    <!-- 날짜/시간 -->
    <div class="row-2">
      <div class="input-group">
        <label for="date">날짜</label>
        <input
          id="date"
          type="date"
          class="input-field"
          bind:value={date}
        />
      </div>
      <div class="input-group">
        <label for="time">시간</label>
        <input
          id="time"
          type="time"
          class="input-field"
          bind:value={time}
        />
      </div>
    </div>

    <!-- 매출액 -->
    <div class="input-group">
      <label for="amount">매출액</label>
      <div class="input-with-unit">
        <input
          id="amount"
          type="text"
          inputmode="numeric"
          class="input-field input-amount"
          placeholder="0"
          value={amountStr}
          oninput={onAmountInput}
          autocomplete="off"
        />
        <span class="input-unit">원</span>
      </div>
    </div>

    <!-- 결제수단 -->
    <div class="input-group">
      <label id="payment-label">결제수단</label>
      <div class="chip-group" role="radiogroup" aria-labelledby="payment-label">
        {#each PAYMENT_METHODS as method}
          <button
            type="button"
            class="chip"
            class:active={paymentMethod === method}
            onclick={() => paymentMethod = method}
          >
            {method}
          </button>
        {/each}
      </div>
    </div>

    <!-- 메모 -->
    <div class="input-group">
      <label for="memo">메모 <span class="label-optional">선택</span></label>
      <input
        id="memo"
        type="text"
        class="input-field"
        placeholder="삼성 SHP-DP960, 비밀번호 변경 등"
        bind:value={memo}
        autocomplete="off"
      />
    </div>

    <!-- 저장 -->
    <button
      type="submit"
      class="btn btn-primary btn-lg btn-block save-btn"
      disabled={saving}
    >
      {saving ? '저장 중...' : '저장'}
    </button>
  </form>
</div>

<!-- 토스트 -->
<div class="toast" class:show={toast.show} class:success={toast.type === 'success'} class:error={toast.type === 'error'}>
  {toast.message}
</div>

<style>
  .page {
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .page-header h1 {
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    letter-spacing: -0.02em;
    padding-top: var(--space-2);
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  .input-with-unit {
    position: relative;
  }

  .input-unit {
    position: absolute;
    right: var(--space-4);
    top: 50%;
    transform: translateY(-50%);
    font-size: var(--text-sm);
    color: var(--text-tertiary);
    pointer-events: none;
  }

  .label-optional {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
    font-weight: var(--weight-normal);
  }

  .save-btn {
    margin-top: var(--space-2);
  }

  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* 날짜/시간 입력 다크 모드 호환 */
  input[type="date"],
  input[type="time"] {
    color-scheme: dark;
  }

  /* ─── 데스크톱 ─── */
  @media (min-width: 1024px) {
    .page-header {
      max-width: 560px;
      margin: 0 auto;
      width: 100%;
    }
    .page-header h1 {
      font-size: var(--text-2xl);
    }
    .form {
      max-width: 560px;
      margin: 0 auto;
      width: 100%;
      gap: var(--space-6);
    }
  }
</style>

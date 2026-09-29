<script>
  import { addService } from '$lib/db.js';
  import { formatDate, formatTime, parseAmount } from '$lib/utils.js';
  import { toast } from '$lib/ui.svelte.js';
  import AmountInput from '$lib/components/AmountInput.svelte';

  const PAYMENT_METHODS = ['현금', '카드', '계좌이체'];

  let date = $state(formatDate());
  let time = $state(formatTime());
  let paymentMethod = $state('카드');
  let amountStr = $state('');
  let memo = $state('');

  let saving = $state(false);

  let amount = $derived(parseAmount(amountStr));

  async function handleSave() {
    if (amount <= 0) {
      toast.show('매출액을 입력해주세요', 'error');
      document.getElementById('amount')?.focus();
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

      toast.show(`${amount.toLocaleString('ko-KR')}원 저장 완료`, 'success');
      resetForm();
    } catch (err) {
      toast.show('저장에 실패했습니다', 'error');
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
</script>

<svelte:head>
  <title>매출 입력 — 도어락 장부</title>
</svelte:head>

<div class="page form-page">
  <header class="page-header">
    <h1 class="page-title">매출 입력</h1>
  </header>

  <form class="form" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
    <AmountInput id="amount" label="매출액" size="lg" bind:value={amountStr} quick={[10000, 50000, 100000]} />

    <div class="input-group">
      <span class="field-label" id="payment-label">결제수단</span>
      <div class="segmented block" role="radiogroup" aria-labelledby="payment-label">
        {#each PAYMENT_METHODS as method}
          <button
            type="button"
            role="radio"
            aria-checked={paymentMethod === method}
            onclick={() => (paymentMethod = method)}
          >
            {method}
          </button>
        {/each}
      </div>
    </div>

    <div class="row-2">
      <div class="input-group">
        <label for="date">날짜</label>
        <input id="date" type="date" class="input-field" bind:value={date} />
      </div>
      <div class="input-group">
        <label for="time">시간</label>
        <input id="time" type="time" class="input-field" bind:value={time} />
      </div>
    </div>

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

    <div class="save-bar">
      <button type="submit" class="btn btn-primary btn-lg btn-block" disabled={saving}>
        {#if saving}
          저장 중...
        {:else if amount > 0}
          <span class="num">{amount.toLocaleString('ko-KR')}원</span> 저장
        {:else}
          저장
        {/if}
      </button>
    </div>
  </form>
</div>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  /* 저장 버튼은 하단 네비 바로 위에 고정 — 폼이 길어져도 엄지 거리 안 */
  .save-bar {
    position: sticky;
    bottom: calc(var(--nav-height) + var(--safe-bottom));
    margin: 0 calc(var(--space-4) * -1);
    padding: var(--space-3) var(--space-4);
    background: linear-gradient(to top, var(--bg-base) 70%, transparent);
    z-index: 5;
  }

  @media (min-width: 1024px) {
    .form-page {
      max-width: 560px !important;
    }
    .save-bar {
      position: static;
      margin: 0;
      padding: 0;
      background: none;
    }
  }
</style>

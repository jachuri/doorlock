<script>
  import Icon from '$lib/components/Icon.svelte';

  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  /** @param {SubmitEvent} e */
  async function handleLogin(e) {
    e.preventDefault();
    if (!password.trim()) {
      error = '비밀번호를 입력해주세요';
      return;
    }

    loading = true;
    error = '';

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() })
      });

      if (res.ok) {
        // 인증 성공 → 메인으로 이동
        window.location.href = '/';
      } else {
        error = '비밀번호가 틀렸습니다';
        password = '';
      }
    } catch {
      error = '서버 오류가 발생했습니다';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>로그인 — 도어락 장부</title>
</svelte:head>

<div class="login-page">
  <div class="login-card">
    <div class="login-header">
      <span class="login-mark"><Icon name="key" size={30} stroke={2.1} /></span>
      <h1>도어락 장부</h1>
      <p>매출 · 매입 · 순수익 관리</p>
    </div>

    <form class="login-form" onsubmit={handleLogin}>
      <div class="input-group">
        <label for="password" class="sr-only">비밀번호</label>
        <input
          id="password"
          type="password"
          class="input-field password-input"
          class:has-error={!!error}
          placeholder="비밀번호"
          bind:value={password}
          autocomplete="current-password"
          aria-invalid={!!error}
          aria-describedby={error ? 'login-error' : undefined}
          autofocus
        />
        {#if error}
          <p class="error-msg" id="login-error" role="alert">{error}</p>
        {/if}
      </div>

      <button type="submit" class="btn btn-primary btn-lg btn-block" disabled={loading}>
        {loading ? '확인 중...' : '들어가기'}
      </button>
    </form>
  </div>
</div>

<style>
  .login-page {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-5);
    background:
      radial-gradient(ellipse 80% 50% at 50% 0%, var(--brand-muted), transparent 70%),
      var(--bg-base);
  }

  .login-card {
    width: 100%;
    max-width: 340px;
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .login-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    text-align: center;
  }

  .login-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    margin-bottom: var(--space-2);
    border-radius: var(--radius-lg);
    background: var(--brand);
    color: var(--on-brand);
    box-shadow: var(--shadow-md);
  }

  .login-header h1 {
    font-size: var(--text-2xl);
    font-weight: var(--weight-heavy);
    letter-spacing: -0.035em;
  }

  .login-header p {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .password-input {
    min-height: 54px;
    text-align: center;
    font-size: var(--text-lg);
    letter-spacing: 0.1em;
  }
  .password-input.has-error { border-color: var(--negative); }

  .error-msg {
    text-align: center;
    font-size: var(--text-sm);
    color: var(--negative);
  }
</style>

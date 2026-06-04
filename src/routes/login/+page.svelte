<script>
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

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
      <span class="login-icon">🔑</span>
      <h1>도어락 장부</h1>
      <p>비밀번호를 입력해주세요</p>
    </div>

    <form class="login-form" onsubmit={handleLogin}>
      <div class="input-group">
        <input
          type="password"
          class="input-field password-input"
          placeholder="비밀번호"
          bind:value={password}
          autocomplete="current-password"
          autofocus
        />
      </div>

      {#if error}
        <p class="error-msg">{error}</p>
      {/if}

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
    background: var(--bg-base);
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
    gap: var(--space-3);
    text-align: center;
  }

  .login-icon {
    font-size: 40px;
    line-height: 1;
  }

  .login-header h1 {
    font-size: var(--text-2xl);
    font-weight: var(--weight-bold);
    letter-spacing: -0.03em;
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
    text-align: center;
    font-size: var(--text-lg);
    letter-spacing: 0.1em;
    padding: var(--space-4);
  }

  .error-msg {
    text-align: center;
    font-size: var(--text-sm);
    color: var(--negative);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>

<script>
  import { toast } from '$lib/ui.svelte.js';
  import Icon from './Icon.svelte';
</script>

<div class="toaster" aria-live="polite" aria-atomic="true">
  {#if toast.current}
    {#key toast.current.id}
      <button type="button" class="toast {toast.current.type}" onclick={() => toast.dismiss()}>
        <span class="toast-icon">
          <Icon name={toast.current.type === 'error' ? 'alert' : toast.current.type === 'info' ? 'info' : 'check'} size={18} stroke={2.2} />
        </span>
        <span>{toast.current.message}</span>
      </button>
    {/key}
  {/if}
</div>

<style>
  .toaster {
    position: fixed;
    left: 50%;
    bottom: calc(var(--nav-height) + var(--safe-bottom) + var(--space-4));
    transform: translateX(-50%);
    width: calc(100% - var(--space-8));
    max-width: 420px;
    display: flex;
    justify-content: center;
    z-index: 1000;
    pointer-events: none;
  }

  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 48px;
    padding: var(--space-3) var(--space-5) var(--space-3) var(--space-4);
    background: var(--text-primary);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    text-align: left;
    cursor: pointer;
    animation: pop-in var(--duration-normal) var(--ease-out);
  }

  .toast-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: var(--radius-full);
    flex-shrink: 0;
    background: var(--positive);
    color: #fff;
  }
  .toast.error .toast-icon { background: var(--negative); }
  .toast.info .toast-icon { background: var(--accent); }

  @media (min-width: 1024px) {
    .toaster {
      bottom: var(--space-8);
      left: calc(50% + var(--sidebar-width) / 2);
    }
  }
</style>

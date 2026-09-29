<script>
  import { confirmDialog } from '$lib/ui.svelte.js';
  import Sheet from './Sheet.svelte';
</script>

{#if confirmDialog.current}
  {@const c = confirmDialog.current}
  <Sheet title={c.title} size="sm" onclose={() => confirmDialog.settle(false)}>
    {#if c.message}
      <p class="confirm-message">{c.message}</p>
    {/if}
    {#snippet footer()}
      <button type="button" class="btn btn-secondary btn-lg" onclick={() => confirmDialog.settle(false)}>
        {c.cancelLabel}
      </button>
      <button
        type="button"
        class="btn btn-lg {c.danger ? 'btn-danger-solid' : 'btn-primary'}"
        onclick={() => confirmDialog.settle(true)}
      >
        {c.confirmLabel}
      </button>
    {/snippet}
  </Sheet>
{/if}

<style>
  .confirm-message {
    font-size: var(--text-base);
    color: var(--text-secondary);
    line-height: 1.6;
    white-space: pre-line;
  }
  :global(.sheet-footer) > :global(.btn) {
    flex: 1;
  }
</style>

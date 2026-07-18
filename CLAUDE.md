# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"도어락 장부" (Doorlock Ledger) — a mobile-first SvelteKit web app for a door-lock repair/installation business to track daily sales (매출/services), material purchases (매입/purchases), and net profit. Single-user, password-gated (not per-user accounts), deployed to Vercel with Neon Postgres as the database.

## Commands

- `npm run dev` — start dev server (`-- --open` to open a browser tab)
- `npm run build` / `npm run preview` — production build / preview
- `npm run check` / `npm run check:watch` — svelte-kit sync + svelte-check (JSDoc-based type checking, no `.ts` files — see `jsconfig.json`)

No test suite or lint script is configured in this repo.

## Environment

- Requires `POSTGRES_URL` or `DATABASE_URL` (Neon connection string) — see `src/lib/server/db.js`. Without it, any DB-touching route throws.
- `APP_PASSWORD` — the single shared login password (defaults to `doorlock1234` if unset). This is a master credential: it authenticates `/api/auth` (cookie login) and `/api/widget/summary` (header-based auth for a home-screen widget), and once logged in via cookie it also grants access to destructive routes (`/api/data` POST/DELETE — full restore/wipe).
- `CLAUDE_DATA_KEY` — a separate, read-only-by-construction key (distinct from `APP_PASSWORD`) gating `/api/claude/export`, a GET-only route with no write/delete handlers. Exists so an agent/automation can pull live data without holding a credential that can also wipe the database.
- `.env` is gitignored; no `.env.example` is checked in.

## Architecture

**Auth**: `src/hooks.server.js` gates every route behind a `auth=authenticated` cookie, redirecting to `/login` otherwise. A handful of routes bypass the cookie check: `/login`, `/api/auth`, `/api/db/init` (always open), and two header-key-authenticated routes that skip cookies entirely — `/api/widget/summary` (`x-widget-key` == `APP_PASSWORD`, for a home-screen widget) and `/api/claude/export` (`x-claude-key` == `CLAUDE_DATA_KEY`, read-only data pull). When adding another externally-triggered endpoint, follow this same header-key pattern rather than reusing the cookie flow.

**Data layer is server-only Postgres, accessed via fetch, not direct DB calls from components**:
- `src/lib/server/db.js` — `getSQL()` returns a Neon tagged-template SQL client. Only ever imported from `+server.js` route handlers (server-side).
- `src/lib/db.js` — client-side service module. Every exported function (`getServicesByDate`, `addPurchase`, `exportAllData`, etc.) just wraps a `fetch()` to the matching `/api/*` route and returns JSON. Svelte pages import from here, never from `$lib/server/db.js`. This mirrors an original IndexedDB version's function signatures (per its own comment) — the shape was kept stable while swapping the storage backend to Postgres.
- Schema (see `src/routes/api/db/init/+server.js`, idempotent `CREATE TABLE IF NOT EXISTS`): `services(id, date, time, payment_method, amount, parts_cost, memo, created_at)` and `purchases(id, date, supplier, amount, memo, created_at)`. Dates are stored as `VARCHAR(10)` (`YYYY-MM-DD` strings), not native DATE columns — filters/joins use string comparison (`date >= start AND date <= end`).
- API routes return **camelCase** JSON (`paymentMethod`, `partsCost`) even though Postgres columns are snake_case — the mapping happens manually in each route handler (see `services/+server.js`). When adding a new field, remember to map it both directions.

**Business logic duplication to watch for**: net profit / margin calculation (`sales - partsCost - purchaseAmount`, margin = `netProfit/sales * 100`) is independently implemented in at least three places that must stay consistent: `src/routes/api/widget/summary/+server.js` (server-side monthly aggregate for the widget), `src/lib/excel.js` (client-side Excel export summary sheet), and the dashboard/history page components. There's no shared aggregation utility — if you change the profit formula, grep for `netProfit`/`marginRate` across routes and pages.

**Routes** (`src/routes/`): `/` dashboard, `/input` add a sale, `/purchase` add/manage purchases, `/history` browse records, `/settings` (backup/restore/clear via `/api/data`), `/login`.

**History calendar view** (`/history`, calendar-grid mode): each day cell stacks 4 lines — 매출/매입/순수익/건수 — with a deliberate color hierarchy: 매출 uses `--accent-text` (blue) and 매입 uses `--text-tertiary` (gray), both small/de-emphasized; 순수익 alone uses the dynamic `--positive`/`--negative` (green/red) and is the largest, boldest line. This is intentional — giving 매출/매입 the same green/red treatment was tried and rejected because it diluted 순수익's role as the at-a-glance verdict. Both 매출 and 매입 always render (including `0`) so every cell has the same line count and stays vertically aligned. Money lines use `transform: scaleX(...)` (장평/letter-width compression) to fit more digits at a readable font-size in a narrow cell; cell height comes from `grid-auto-rows` on `.calendar-grid`, not `aspect-ratio` (a square cell doesn't leave room for 4 lines).

**Excel export** (`src/lib/excel.js`) dynamically imports SheetJS from a CDN URL at call time (not bundled) to keep the initial bundle small — this is a deliberate runtime dependency, not a missing package install.

**Styling**: no Tailwind/CSS framework — plain component-scoped `<style>` blocks using CSS custom properties defined globally (`--bg-raised`, `--text-primary`, `--space-*`, `--radius-*`, etc. — see `src/app.css`). Layout is constrained to a `--max-width` mobile-app-like column with a fixed bottom nav (`src/routes/+layout.svelte`).

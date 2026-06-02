## Summary
Adds a public REST API (v1) with full documentation site, expands analytics with health metrics, enables creating integration issues directly from feedback posts, and ships admin tooling and affiliate dashboard components.

## Changes

### Public API & Docs
- New `routes/v1+/` REST endpoints covering posts, boards, categories, tags, comments, votes, roadmap, users, webhooks, and changelog
- API key auth middleware and cursor-based pagination in `lib/api/`
- New `apps/docs/` Astro/Starlight site with quickstart, full endpoint reference, and embedded OpenAPI explorer

### Analytics
- New health KPI row, backlog aging chart, and subscriber metrics card
- Server-side queries for resolution time, response rate, vote conversion, and merge rate

### Integrations & Post Detail Panel
- Create Asana task, Jira issue, and Linear issue modals directly from a feedback post
- Link-issue popover and integration sidebar in post detail panel
- Updated Asana, Jira, and Linear clients, schemas, and services

### Admin & Affiliate
- New admin panel with users table and impersonation banner
- New affiliate dashboard, history, and join card components

### Auth
- Password strength meter and password field component
- Updated change-password form

### Widget SDK
- Expanded `packages/react` with `board.tsx`, `provider.tsx`, and `types.ts`
- New shared `packages/errors` package for typed API error codes

### DB & Config
- Schema and migration snapshots updated (includes `anonymize_users` column — run `pnpm db:generate && pnpm db:push` manually)
- Updated env vars, app styles, and `pnpm-lock.yaml`

## Test plan
- [ ] Hit v1 API endpoints with a valid API key and confirm org-scoped responses
- [ ] Verify docs site builds and OpenAPI explorer renders correctly
- [ ] Open a feedback post and test create-issue modals for Asana, Jira, and Linear
- [ ] Confirm analytics health KPI row and backlog aging chart render without errors
- [ ] Check admin users table loads and impersonation banner appears
- [ ] Run DB migration manually and confirm `anonymize_users` column exists
- [ ] Smoke test widget board rendering with the new provider

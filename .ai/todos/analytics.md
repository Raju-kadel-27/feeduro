# Analytics Feature — Phase Tracker

## Phase 1 — Shipped ✅
Simple live SQL queries via Drizzle. No materialized views, no new infra.
Appropriate for current scale (≤500 teams). All queries return in <10ms with existing indexes.

### Implemented
- `app/features/analytics/schemas/analytics.ts` — Zod schemas for all query results
- `app/features/analytics/server/vote-trends.server.ts` — votes per day/week per post or board
- `app/features/analytics/server/status-funnel.server.ts` — avg days per status transition from `postActivities`
- `app/features/analytics/server/contributor-rank.server.ts` — top voters + submitters per org
- `app/features/analytics/server/board-summary.server.ts` — posts opened vs resolved, response rate per board
- `app/features/analytics/server/segment-demand.server.ts` — filter vote counts by `userProfiles` fields (plan, role, companySize, industry)
- `app/routes/api+/analytics.ts` — thin route, dispatches to feature-layer queries via intent

---

## Phase 2 — Not yet started
Gate: a paying customer asks for real-time data, OR a specific query becomes measurably slow in production.

### To implement
- [ ] **Changelog engagement tracking** — add `changelogViews` table (organizationId, changelogId, userId/fingerprint, viewedAt). Shows "X users saw this release". Closes the request → shipped → received loop.
- [ ] **Materialized views** — only if specific queries become slow at scale (5k+ teams). Use Drizzle's `pgMaterializedView` declared in `db/schema/analytics.ts` — drizzle-kit auto-generates the migration. Refresh via `db.refreshMaterializedView(view).concurrently()` called from a Cloudflare Cron Trigger worker. Target candidates: `mv_board_summary`, `mv_vote_trends`. Parameterized queries (`status_funnel`, `segment_demand`) cannot be materialized and stay as live queries.
- [ ] **Real-time streaming** — if hourly/daily staleness is unacceptable, stream vote/post/view events to Tinybird from Workers (fire-and-forget). Dashboard queries Tinybird instead of Postgres for heavy aggregations.
- [ ] **AI theme clustering** — group semantically similar feedback posts ("47 users asking for offline mode in different words"). Requires embeddings on `feedbackPosts.description` + vector similarity. Separate pipeline (pgvector or external).

---

## Decision log
- **Chose live queries over materialized views for Phase 1** because at 500 teams the data volume is tiny (~150k votes cumulative). Materialized views would save ~8ms per query — invisible to users, not worth the added complexity.
- **Chose Drizzle queries over Tinybird** for Phase 1 because existing Postgres schema has all necessary data and the query frequency is low (PMs check analytics occasionally, not on every page load).
- **Drizzle view API noted for Phase 2**: `pgMaterializedView` in schema + `db.refreshMaterializedView().concurrently()` is the right pattern — no manual `analyticsCache` table needed. Regular `pgView` not useful here since analytics queries need runtime parameters.

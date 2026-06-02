# Support Help Desk — Feature Roadmap

## Phase 1 — SHIPPED ✅

The base support agent queue is live at `/{orgSlug}/support`.

**Files created:**
- `apps/web/app/features/support/schemas/index.ts` — `SupportPost`, `QueueMetrics`, `SupportFilters` Zod types
- `apps/web/app/features/support/server/queries.ts` — `getSupportQueue()` + `getQueueMetrics()`
- `apps/web/app/features/support/components/queue-metrics-bar.tsx` — 4-stat header (Open / Unassigned / Mine / Needs Reply)
- `apps/web/app/features/support/components/queue-filters.tsx` — Board, status, assignee, sort, "Needs reply only" filters
- `apps/web/app/features/support/components/queue-row.tsx` — Row with urgency dot, title, status pill, vote/comment counts, Claim button
- `apps/web/app/features/support/components/support-queue.tsx` — Main layout; opens `PostDetailPanel` overlay on click
- `apps/web/app/routes/$orgSlug+/support.tsx` — Route (admin/owner only, redirects members)
- `apps/web/app/features/layout/components/app-sidebar/workspace-nav.tsx` — Added "Support" nav item (Headphones icon)

**What Phase 1 does:**
- Queue sorted by urgency: customer-unanswered posts first, then oldest-unresponded, then active
- Urgency dot: amber = needs reply, red = >48h stale, orange = >12h, green = recent, gray = no comments
- `needsReply` flag: latest public comment's `userId` is not an org member
- "Claim" button: inline `assign_owner` mutation, no panel open needed
- Filters: board, status, assignee (All / Me / Unassigned / specific agent), sort, needs-reply toggle
- Metrics bar: Open, Unassigned, My Queue, Needs Reply counts

---

## Phase 2 — P0 (Build Next) 🔥

### 2a. Canned Responses / Templates

**Why:** Single biggest agent time-saver. Pre-written answers inserted with one click.

**DB:** New table `canned_responses`
```sql
id          varchar(128) PK
org_id      varchar(36)  NOT NULL → organization.id
title       varchar(200) NOT NULL
body        text         NOT NULL
category    varchar(100)           -- e.g. "Bug Acknowledgement", "Feature Timeline"
created_by  varchar(36)  → user.id
created_at  timestamp    NOT NULL DEFAULT now()
updated_at  timestamp    NOT NULL DEFAULT now()
```
Index: `(org_id)` for org-scoped listing.
Run migration: `pnpm db:generate && pnpm db:push` (user must run this).

**Files to create:**
- `apps/web/db/schema/app.ts` — add `cannedResponses` table + export
- `apps/web/app/features/support/schemas/canned-responses.ts` — Zod schemas
- `apps/web/app/features/support/server/canned-responses.ts` — `getCannedResponses()`, `createCannedResponse()`, `updateCannedResponse()`, `deleteCannedResponse()`
- `apps/web/app/features/support/components/canned-response-picker.tsx` — Popover with search + list, click to insert body text
- `apps/web/app/features/support/components/settings/canned-responses-panel.tsx` — Manage library (table + create/edit dialog)
- `apps/web/app/routes/$orgSlug+/settings+/support.tsx` — Settings route for the panel
- Modify `apps/web/app/features/post-detail-panel/components/post-compose-footer.tsx` — Add "Templates" button that opens `CannedResponsePicker`, inserts selected body into textarea

**Settings sidebar:** Add "Support" under the "Product" section in `settings-sections.ts`.

---

### 2b. Inline Status Change in Queue Row

**Why:** Agents must open the full panel just to triage. A status dropdown in the row cuts context-switching.

**Files to modify:**
- `apps/web/app/features/support/components/queue-row.tsx` — Replace static status pill with a `<select>` dropdown; on change POST `{ intent: "update_status", id, status }` to `/api/status-changes`; optimistic UI + `invalidateQueries(["support-queue"])`

**API endpoint to POST to:** `/api/status-changes` (already exists).

---

### 2c. Bulk Actions Toolbar

**Why:** Clearing a 50-post backlog one at a time is brutal. Select + "Close all" is non-negotiable.

**Files to create/modify:**
- `apps/web/app/features/support/components/queue-row.tsx` — Add checkbox column (left of urgency dot); stop-propagation so it doesn't open the panel
- `apps/web/app/features/support/components/bulk-action-bar.tsx` — Sticky bottom bar (appears when selection > 0): "{N} selected · [Assign to me] [Mark Reviewing] [Close] [Clear]"
- `apps/web/app/features/support/components/support-queue.tsx` — Track `selectedIds: Set<string>` state; pass into rows + render `BulkActionBar`
- `apps/web/app/routes/api+/_feedback+/bulk.ts` — New API route: POST `{ ids[], intent, value? }` → batch update in `db.transaction()`; supported intents: `bulk_status`, `bulk_assign_owner`

---

### 2d. SLA First-Response Timer

**Why:** The urgency dot is relative to last comment — a post with 0 comments can sit for days unnoticed. "No reply · 6h" in red makes it concrete.

**Files to modify:**
- `apps/web/app/features/support/server/queries.ts` — Add `firstAdminReplyAt` to `getSupportQueue()`: subquery `SELECT MIN(created_at) FROM comments WHERE post_id = ANY(...) AND is_internal = false AND user_id IN (SELECT user_id FROM member WHERE org_id = ?)` — batch it in `Promise.all`
- `apps/web/app/features/support/schemas/index.ts` — Add `firstAdminReplyAt: z.string().nullable()` to `SupportPostSchema`
- `apps/web/app/features/support/components/queue-row.tsx` — Show `⚑ No reply · Xh` badge in red when `firstAdminReplyAt` is null

---

## Phase 3 — P1 (Next Sprint)

### 3a. Customer Context Card

**Why:** Knowing a submitter's plan + past posts lets agents calibrate tone and priority instantly.

**Files to create:**
- `apps/web/app/features/support/components/customer-context-card.tsx` — Shows: avatar, name, email, plan, company, role (from `user_profiles`), and a compact list of their other open posts in this org
- `apps/web/app/features/support/server/customer-context.ts` — `getCustomerContext(orgId, userId)`: query `user_profiles` + sibling `feedbackPosts` (WHERE `createdBy = userId AND id != postId`)

**Integration point:** `PostIntegrationSidebar` in `apps/web/app/features/post-detail-panel/components/post-integration-sidebar.tsx` — add `CustomerContextCard` at the bottom of the right rail when `post.createdBy` is set.

---

### 3b. Reply + Status Change in One Action

**Why:** "Send & Close" = 1 click instead of 2. Standard in every support tool.

**Files to modify:**
- `apps/web/app/features/post-detail-panel/components/post-compose-footer.tsx` — Add a status select next to the Send button: "Send" (no status change) or "Send & [status]". On submit, fire comment mutation then status change mutation sequentially (or wrap server-side in a transaction via a combined endpoint)

---

### 3c. @Mentions in Internal Notes

**Why:** Async handoffs between agents — "hey @mike, this is an enterprise customer."

**Files to create/modify:**
- `apps/web/app/features/feedback/server/api-comments-mutations.ts` — After comment insert, parse `@username` from body, resolve to `userId` via member list, insert `notification` rows (type: `mention`)
- `apps/web/app/features/post-detail-panel/components/post-activity-feed.tsx` — Highlight `@name` mentions in comment bodies

---

### 3d. Queue Search

**Why:** Zero new infrastructure — hits the existing `tsvector` GIN index.

**Files to modify:**
- `apps/web/app/features/support/schemas/index.ts` — Add `search?: string` to `SupportFilters`
- `apps/web/app/features/support/components/queue-filters.tsx` — Add search input (debounced, 300ms)
- `apps/web/app/features/support/components/support-queue.tsx` — Filter `allPosts` client-side by title/description match (for fast local filtering); OR pass `search` param to a re-fetch against `/api/feedback?q=...`

---

## Phase 4 — P2 (Later)

### 4a. Post Snooze
"Come back in 3 days." Requires:
- New column: `feedbackPosts.snoozedUntil timestamp` + `snoozedByUserId varchar`
- Cron job / Cloudflare Scheduled Worker to unsnooze (set `snoozedUntil = NULL`) on timer
- "Snooze" button in `PostDetailHeader` with a date picker popover
- Queue query: add `WHERE (snoozed_until IS NULL OR snoozed_until <= now())` to `getSupportQueue()`

### 4b. CSAT Survey
After post status → `completed`, email submitter a one-question thumbs up/down survey.
Requires:
- New table: `csat_responses` (postId, orgId, submitterEmail, rating: positive|negative, comment, respondedAt)
- Email trigger in `api-status-changes.ts` when status transitions to `completed` and submitter email is known (`submitterEmail` or `user.email`)
- Public response URL: `/r/csat/:token` (unauthenticated)
- Analytics widget on the Support metrics bar

### 4c. Auto-Routing Rules
"Posts from board 'Billing' → always assign to @alice."
Requires:
- New table: `routing_rules` (orgId, condition: JSON, assignToUserId)
- Hook in `api-posts-mutations.ts` post-creation: evaluate rules, fire `assign_owner` if matched
- Rules management UI in `/settings/support`

### 4d. Keyboard Shortcuts
Full keyboard workflow for power agents:
- `j` / `k` — move selection up/down in queue
- `Enter` — open selected post
- `Esc` — close panel
- `c` — claim post
- `s` — open status dropdown

Files: `apps/web/app/features/support/hooks/use-queue-keyboard.ts` + wire into `SupportQueue`.

---

## Notes

- All new DB tables need `organizationId` scoping on every query (non-negotiable).
- Canned responses settings page should be added under `settings-sections.ts` → Product group → "Support".
- The bulk action API must use `db.transaction()` for atomicity.
- `firstAdminReplyAt` computation should be batched in `Promise.all` alongside the existing comment queries — never a sequential await.

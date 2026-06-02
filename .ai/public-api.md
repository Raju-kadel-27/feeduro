# Public API — Phase Tracker

Base: `/v1/`  
Auth: `Authorization: Bearer <api_key>`  
Pagination: cursor-based (`?limit=N&cursor=<token>`)  
Response: `{ data, hasMore, cursor }` (list) · `{ data }` (single) · `{ error, code }` (error)

---

## Phase 1 — Core ✅

| Endpoint | Methods | Files |
|---|---|---|
| `/v1/boards` | GET | `routes/v1+/boards.ts` + `features/feedback/server/api-boards.ts` |
| `/v1/boards/:id` | GET | `routes/v1+/boards.$id.ts` |
| `/v1/posts` | GET, POST | `routes/v1+/posts.ts` + `features/feedback/server/api-posts.ts` |
| `/v1/posts/:id` | GET, PATCH, DELETE | `routes/v1+/posts.$id.ts` |

Auth guard: `app/lib/api/require-api-key.ts`

---

## Phase 2 — Votes & Comments ✅

| Endpoint | Methods | Files |
|---|---|---|
| `/v1/votes` | GET, POST | `routes/v1+/votes.ts` + `features/feedback/server/api-votes.ts` + `api-votes-mutations.ts` |
| `/v1/votes/:id` | DELETE | `routes/v1+/votes.$id.ts` |
| `/v1/comments` | GET, POST | `routes/v1+/comments.ts` + `features/feedback/server/api-comments.ts` + `api-comments-mutations.ts` |
| `/v1/comments/:id` | GET, DELETE | `routes/v1+/comments.$id.ts` |

Shared cursor util: `app/lib/api/cursor.ts`  
Note: vote/comment create requires a valid `userId` (better-auth user ID, obtainable via `/v1/users/identify` in Phase 4)

---

## Phase 3 — Taxonomy ✅

| Endpoint | Methods | Notes |
|---|---|---|
| `/v1/tags` | GET, POST | 409 on duplicate name |
| `/v1/tags/:id` | DELETE | Cascades post-tag rows via FK |
| `/v1/posts/:id/tags` | POST | Body: `{ tagId }` — idempotent via `onConflictDoNothing` |
| `/v1/posts/:id/tags/:tagId` | DELETE | Removes assignment only, not the tag itself |
| `/v1/categories` | GET, POST | 409 on duplicate name |
| `/v1/categories/:id` | DELETE | Sets posts' `categoryId` to null via FK |

Service files: `features/feedback/server/api-tags.ts` + `api-categories.ts`  
Reuses: existing `tags.server.ts` + `categories.server.ts` service functions

---

## Phase 4 — Changelog & Users ✅

| Endpoint | Methods | Notes |
|---|---|---|
| `/v1/changelog` | GET, POST | `?status=draft\|published` filter; POST fires `changelog.created` + optionally `changelog.published` webhook |
| `/v1/changelog/:id` | GET | Returns full `body` field |
| `/v1/users` | GET | Cursor-paginated; `customAttributes` auto-parsed from JSON |
| `/v1/users/identify` | POST | Upsert by email — returns `{ id }`; reuses existing `upsertUserProfile` |
| `/v1/users/:id` | GET, DELETE | Deletes profile only, not the auth user |

Service files: `features/changelog/server/api-changelog.ts` · `features/segmentation/server/api-users.ts`

---

## Phase 5 — Roadmap & Webhooks ✅

### Roadmap

| Endpoint | Methods | Notes |
|---|---|---|
| `/v1/roadmap` | GET | Returns `{ data: { columns: { open, reviewing, planned, in-progress, completed, closed } } }`; excludes merged posts; sorted by rank ASC NULLS LAST then createdAt DESC; `?status=` filters to a single column |
| `/v1/roadmap/posts/:id` | PATCH | Body: `{ status?, rank? }` — updates status and/or rank (float); at least one required |

Service: `features/roadmap/server/api-roadmap.ts`

### Webhooks management

| Endpoint | Methods | Notes |
|---|---|---|
| `/v1/webhooks` | GET | Lists all endpoints (secret never returned on list) |
| `/v1/webhooks` | POST | Creates endpoint; returns `secret` only on creation (not retrievable later); max 10 per org; URL must be HTTPS |
| `/v1/webhooks/:id` | GET | Single endpoint details |
| `/v1/webhooks/:id` | PATCH | Body: `{ url?, name?, events?, isActive? }` — at least one required |
| `/v1/webhooks/:id` | DELETE | Removes endpoint |

Supported events: `feedback.created`, `feedback.status_changed`, `comment.created`, `changelog.created`, `changelog.published` (or `["*"]` for all)  
Service: `features/webhooks/server/api-webhooks.ts`

---

## Phase 6 — Status Changes ✅

| Endpoint | Methods | Notes |
|---|---|---|
| `/v1/posts/:id/status-changes` | GET | Cursor-paginated audit trail; returns `oldStatus`, `newStatus`, `changedById`, `changedByName`, `createdAt`; 404 if post not in org |

- Reads from `postActivities` table filtered to `type = 'status_changed'`
- `userId` / `changedByName` are nullable — rows survive user deletion by design
- Ordered newest-first; same `?limit=&cursor=` convention as other list endpoints
- Service: `features/feedback/server/api-status-changes.ts`

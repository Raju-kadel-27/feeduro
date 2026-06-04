# /audit-flow

Audit a route file's complete end-to-end working mechanism and assess whether it is production-ready. If issues are found, resolve them.

## Input

The user must supply a file path as the argument (e.g. `/audit-flow apps/web/app/routes/$orgSlug+/settings+/password.tsx`). If no path is given, ask: *"Which route file should I audit? Please provide the path."*

## Steps

### 1 — Read the entry point

Read the route file at the given path in full. Identify:
- The **loader** — auth guards, DB queries, returned shape
- The **action** — intent dispatch, mutations, redirects, error handling
- The **component** — data consumption pattern, form wiring, UI structure

### 2 — Trace all imports (parallel)

For every imported symbol that originates from this project (guards, server functions, form components, schemas, hooks), read those files in parallel. Build a mental map of the full call chain from HTTP request to response.

### 3 — Cross-reference the project's non-negotiable rules

Check every point below. For each one, mark **PASS**, **FAIL**, or **N/A**:

| # | Rule | Check |
|---|------|-------|
| 1 | Route is thin — no DB logic, no external calls inline | |
| 2 | Feature logic lives in `features/<name>/server/` | |
| 3 | Request body parsed with Zod, never cast as `string` or `as SomeType` | |
| 4 | All DB queries scoped to `organizationId` | |
| 5 | No N+1 queries — batched with `Promise.all` + `inArray` | |
| 6 | Drizzle queries specify `columns` — no SELECT * | |
| 7 | Filter/aggregate in DB, not in JS | |
| 8 | Multiple mutations wrapped in `db.transaction()` | |
| 9 | `data()` used (not deprecated `json()`) from react-router | |
| 10 | Loader data consumed via `Route.ComponentProps`, not `useLoaderData<typeof loader>()` | |
| 11 | `requireOrganization` (or equivalent guard) called at top of loader/action | |
| 12 | Route exports an `ErrorBoundary` | |
| 13 | No silent `catch {}` — errors logged with `[feature]` prefix | |
| 14 | All files under 150 lines | |
| 15 | No `.server.ts` suffix on files inside a `/server/` directory | |
| 16 | Imports use `@features/` aliases, not `../../` across feature boundaries | |
| 17 | No `forwardRef` (React 19 — pass ref as plain prop) | |
| 18 | `getDb()` called inside function body, never at module level | |
| 19 | No `useMemo`/`useCallback` (React 19 compiler handles memoization) | |
| 20 | Heavy components lazy-loaded with `React.lazy` + `Suspense` where applicable | |

### 4 — Security audit

Independently of the rule checklist, look for:
- **Auth bypass** — can an unauthenticated or cross-tenant request reach the handler?
- **Input injection** — unsanitized values reaching DB queries or shell commands?
- **Information leakage** — error messages or loader data exposing sensitive internals?
- **CSRF / idempotency** — mutations protected against replay or CSRF?
- **Secrets in responses** — tokens, hashes, or internal IDs returned unnecessarily?

### 5 — UX / correctness audit

- Does the form handle loading, success, and error states visibly?
- Are validation errors surfaced to the user?
- Are destructive or irreversible actions confirmed before execution?
- Is optimistic UI used where latency matters, and are rollbacks handled?

### 6 — Verdict

State one of:
- **PRODUCTION-READY** — all critical rules pass, no security issues found.
- **NEEDS WORK** — list every failing check with a short explanation and its severity (`critical` / `major` / `minor`).

### 7 — Resolve issues

For every **critical** and **major** issue: apply the fix inline, following all project conventions (thin routes, feature-server layout, Zod parsing, `data()`, `Route.ComponentProps`, etc.). For **minor** issues: apply them too unless the file would exceed 150 lines — in that case flag them for the user.

After all edits:
- Confirm file line counts stay within limits.
- Re-read the changed files to verify the fixes are coherent.
- Report a concise summary: what was fixed, what remains, and any manual steps the user must take (migrations, env vars, etc.).

## Output format

```
## Audit: <file path>

### Call chain
<one-paragraph summary of request → response path>

### Rule checklist
<table with PASS / FAIL / N/A per rule>

### Security findings
<bullet list, or "None found">

### UX / correctness findings
<bullet list, or "None found">

### Verdict
PRODUCTION-READY | NEEDS WORK

### Fixes applied
<list of changes made, or "None required">

### Manual steps
<anything the user must do: run migration, set env var, etc. — or "None">
```

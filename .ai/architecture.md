# Architecture Rules

## Feature Module Layout

Every business domain lives under `app/features/<name>/`.

```
features/feedback/
├── components/        # UI components for this domain
├── hooks/             # React hooks
├── server/
│   ├── queries.ts     # Read-only DB operations
│   ├── mutations.ts   # Write / update / delete operations
│   ├── permissions.ts # Authorization checks
│   └── service.ts     # Orchestration, workflows, side effects
├── schemas/           # Zod validation schemas
├── types.ts           # Domain types
└── constants.ts       # Domain constants
```

Domains in this project:
- `feedback` — posts, votes, comments
- `boards` — board config, columns, views
- `changelog` — changelog entries, publishing
- `auth` — sessions, orgs, members
- `workspace` — org settings, billing, invites
- `integrations` — integration configs (links to services/)

## Naming Conventions

| File | Purpose |
|------|---------|
| `queries.ts` | SELECT / read-only DB |
| `mutations.ts` | INSERT / UPDATE / DELETE |
| `permissions.ts` | Auth checks, role guards |
| `service.ts` | Business logic, side effects, orchestration |
| `types.ts` | TypeScript types for the feature |
| `constants.ts` | Enums, config values |
| `schemas/` | Zod schemas for input validation |

Never name files: `helpers.ts`, `common.ts`, `misc.ts`, `stuff.ts`, `utils.ts` inside a feature.

## Route Handler Pattern

```ts
// GOOD — thin route
export async function action({ request, params }: Route.ActionArgs) {
  return createFeedbackAction({ request, params })
}

// BAD — fat route
export async function action({ request }) {
  const body = await request.json()
  // 50 lines of db + auth + side effects
}
```

## Import Rules

Import from the feature boundary, not deep internal paths.

```ts
// Good
import { createFeedback } from "~/features/feedback/server/service"

// Avoid cross-feature deep imports
import { something } from "~/features/feedback/server/queries"
// (unless you're inside the feedback feature)
```

## File Size

- Target: 100–300 lines
- Hard limit: 500 lines
- If over limit: extract helpers, split responsibilities, move logic to service layer

## Global vs Feature Code

| Code type | Location |
|-----------|----------|
| Feature UI | `features/<name>/components/` |
| Global reusable UI | `components/ui/` |
| Layout / nav | `components/layout/` |
| Feature server logic | `features/<name>/server/` |
| Shared server utilities | `server/` |
| External integrations | `services/<name>/` |
| DB / auth infra | `lib/` |
| Cross-cutting utilities | `utils/` (justify before adding) |

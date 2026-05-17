# React Router v7 Rules

## File Naming Conventions

```
routes/
├── _layout.tsx              # Layout wrapper (no URL segment)
├── index.tsx                # Index route
├── $orgSlug+/               # Dynamic segment, + = pathless layout group
│   ├── dashboard.tsx        # /orgSlug/dashboard
│   ├── feedback.$postId.tsx # /orgSlug/feedback/:postId
│   └── settings+/          # Nested group
└── api+/                    # API-only routes (no UI)
    └── feedback.ts
```

`$` = dynamic param, `+` = pathless group, `_` prefix = layout (no URL segment)

## Always Use Generated Route Types

Every route file has generated types in `./+types/<filename>`.

```ts
// Always import and use these — never type loader args manually
import type { Route } from "./+types/dashboard"

export async function loader({ request, params }: Route.LoaderArgs) {}
export async function action({ request, params }: Route.ActionArgs) {}
export default function Page({ loaderData }: Route.ComponentProps) {}
```

`Route.ComponentProps` gives you typed `loaderData` automatically. Never use `useLoaderData<typeof loader>()` when you can use component props.

## `data()` over `json()`

In RR7, prefer `data()` from `react-router` over the deprecated `json()`.

```ts
import { data } from "react-router"

// Good
return data({ posts }, { status: 200 })
return data({ error: "Not found" }, { status: 404 })

// Avoid
return json({ posts })
```

## Intent-Based Actions

When a single route handles multiple operations, use an `intent` field.
Keep the dispatch thin — delegate each intent to a service function.

```ts
// Good
export async function action({ request }: Route.ActionArgs) {
  const body = await request.json()
  const intent = body.intent as string

  if (intent === "create") return createFeedbackAction(request, body)
  if (intent === "update_status") return updateStatusAction(request, body)

  return data({ error: "Unknown intent" }, { status: 400 })
}

// Bad — all logic inline inside the if blocks
```

## Error Boundaries

Every route that loads data MUST export an `ErrorBoundary`:

```ts
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) return <NotFound />
    if (error.status === 403) return <Forbidden />
  }
  return <GenericError />
}
```

Without this, unhandled errors bubble up to the root boundary and break the entire page.

## Route File Size Limit

Route files that mix UI + types + helpers get huge fast (see `dashboard.tsx` as what NOT to do).

A route file should only contain:
- `meta()` — optional
- `loader()` — delegates to a service
- `action()` — delegates to a service
- `ErrorBoundary` — error UI
- `default` export — the page component

Move everything else out:
- Domain types → `features/<name>/types.ts`
- Helper functions → `features/<name>/lib/`
- Sub-components → `features/<name>/components/`
- Status configs / constants → `features/<name>/constants.ts`

## TanStack Query + Loader Hybrid

This project uses TanStack Query with loader data as `initialData`. This is intentional for optimistic UI and client-side cache invalidation.

```ts
// Pattern: seed TQ cache from loader, keep it fresh via fetch
const { data } = useQuery({
  queryKey: ["feedback", orgSlug],
  queryFn: () => fetch("/api/feedback").then(r => r.json()),
  initialData: loaderData.posts,          // loader seeds the cache
  initialDataUpdatedAt: loaderData.fetchedAt, // controls staleness
  staleTime: 30_000,
})
```

Rules:
- API routes (`/api/*`) serve TanStack Query; page loaders seed initial data
- Always pass `fetchedAt: Date.now()` from the loader for `initialDataUpdatedAt`
- Use `queryClient.invalidateQueries()` after mutations, not manual refetch

## Search Params as State

Use URL search params for filterable, bookmarkable UI state (status filter, board filter, sort).
Use `useState` only for ephemeral non-shareable state (search input, modal open).

```ts
const [searchParams, setSearchParams] = useSearchParams()
const status = searchParams.get("status")
```

## Input Validation

Never cast request body fields directly with `as string`.

```ts
// Bad — no runtime safety
const title = (body.title as string)?.trim()

// Good — Zod validates + types at the boundary
const parsed = CreateFeedbackSchema.safeParse(body)
if (!parsed.success) return data({ error: parsed.error.flatten() }, { status: 400 })
const { title, boardId } = parsed.data
```

Put Zod schemas in `features/<name>/schemas/`.

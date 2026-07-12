# Database Connection Architecture (postgres.js over Hyperdrive)

How the app connects to Neon Postgres on Cloudflare Workers. For query *style*
(org scoping, N+1, `columns`) see [database.md](./database.md). This doc is about
the plumbing underneath `getDb(context)`.

## TL;DR

- One **postgres.js client per request**, created in
  [`app/entry.worker.ts`](../apps/web/app/entry.worker.ts) from
  `env.HYPERDRIVE.connectionString` and closed via `ctx.waitUntil` after the
  response is sent.
- **Hyperdrive** does the connection pooling near the edge — the Worker never
  pools; `prepare: false` because Hyperdrive runs in transaction-pooling mode.
- Handlers get the client with **`getDb(context)`** from
  [`app/middleware/cloudflare.server.ts`](../apps/web/app/middleware/cloudflare.server.ts) —
  it's stored on the `RouterContextProvider`, never module state.
- **Transactions** are just `db.transaction(async (tx) => …)` — postgres.js
  supports interactive transactions natively. No separate transport.

## The pieces

| File | Responsibility |
|---|---|
| [`db/index.ts`](../apps/web/db/index.ts) | `createDb(connectionString)` — postgres.js + Drizzle, returns `{ db, close }`. Exports the `Db`/`Tx` types. |
| [`app/entry.worker.ts`](../apps/web/app/entry.worker.ts) | Creates the per-request client from `env.HYPERDRIVE`, puts it on `CloudflareContext`, closes it in `ctx.waitUntil` after the handler returns. |
| [`app/middleware/cloudflare.server.ts`](../apps/web/app/middleware/cloudflare.server.ts) | `getDb(context)` accessor plus `getBindings`, `waitUntil`, etc. |
| [`apps/web/wrangler.jsonc`](../apps/web/wrangler.jsonc) | The `HYPERDRIVE` binding per environment. `localConnectionString` points dev straight at the docker Postgres. |

```ts
// route/service code — db is always passed down from the request context
export async function loader({ context }: Route.LoaderArgs) {
  const db = getDb(context);
  …
}
```

Never create a module-level client and never share a `Db` across requests —
Workers forbid cross-request I/O reuse, and the request's client is closed as
soon as its response finishes.

## The `Db` instance is request-scoped — use it as a cache key

Because a fresh `Db` is created per request, `WeakMap<Db, …>` is the idiom for
**request-scoped memoization**. Existing examples:

- `requireOrgBySlug` in [`features/auth/server/guards.ts`](../apps/web/app/features/auth/server/guards.ts) —
  layout and leaf loaders both guard in the same single-fetch request; the
  session/org/member lookups run once.
- `getOrgPlanLimits` in [`features/internal/billing/server/plan-limits.ts`](../apps/web/app/features/internal/billing/server/plan-limits.ts).

Follow this pattern for any lookup that multiple loaders repeat within one
request. Entries are garbage-collected with the `Db`, so there is no eviction
logic and no cross-request leakage.

## Performance constraints (production is on the Workers FREE plan)

- **~10ms CPU per request.** Large loader payloads (serializing every post,
  mapping thousands of Drizzle rows) can blow the budget and kill the request
  with error 1102 ("Worker exceeded CPU time limit"). Keep list payloads
  bounded — exclude/truncate big columns, aggregate in SQL, never SELECT *.
- **Every DB roundtrip crosses to Neon's region.** Batch independent queries
  with `Promise.all`; never chain sequential awaits that don't depend on each
  other. Smart Placement (`"placement": { "mode": "smart" }` in wrangler.jsonc)
  moves execution near the database to shrink each roundtrip.
- Each `/api/*` fetch from the client is a **separate Worker invocation** with
  its own CPU budget, auth setup, and queries — avoid fanning out many small
  API calls where one loader can serve the data.

## Local development

`wrangler.jsonc`'s `localConnectionString` points the HYPERDRIVE binding at the
docker Postgres (`postgresql://postgres:postgres@localhost:5432/feeduro`), so
dev uses the exact same code path — postgres.js over TCP — with no proxies.
`docker compose up` starts Postgres.

## Migrations & scripts (separate path)

`drizzle-kit` migrations and `seed`/`nuke` run in **Node/CI**, not the Worker.
They connect directly over TCP via `DATABASE_URL`
([`db/config.ts`](../apps/web/db/config.ts)) — they do not use Hyperdrive.

> Migrations are handled manually by the team — do not run `drizzle-kit generate`
> or edit `_journal.json`.

## Mental model in one line

> One postgres.js client per request, born from Hyperdrive in `entry.worker.ts`
> and passed down through `getDb(context)`; Hyperdrive pools, `db.transaction`
> handles atomicity, and `WeakMap<Db, …>` is your request-scoped cache.

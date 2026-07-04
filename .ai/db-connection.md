# Database Connection Architecture (HTTP + WebSocket hybrid)

How the app connects to Neon Postgres on Cloudflare Workers. For query *style*
(org scoping, N+1, `columns`) see [database.md](./database.md). This doc is about
the *plumbing* underneath `getDb()` and `withTransaction()`.

## TL;DR

- **Reads and single-statement writes** go over Neon's stateless **HTTP** driver
  (`drizzle-orm/neon-http`). Call **`getDb()`** — it returns a shared, module-level
  client. No pool, no connection lifecycle, nothing to close.
- **Interactive transactions** go over a short-lived **WebSocket** pool
  (`drizzle-orm/neon-serverless`). Call **`withTransaction(async (tx) => …)`** — it
  opens a connection, runs the transaction, and closes it.
- No Hyperdrive, no `AsyncLocalStorage`, no per-request pooling. Two small helpers.

## Why two transports

Neon's serverless driver offers two ways to reach Postgres from a Worker:

| Transport | Driver | Used by | Transactions? |
|---|---|---|---|
| **HTTP** (fetch) | `neon-http` | `getDb()` — the default | ❌ single statements only |
| **WebSocket** | `neon-serverless` `Pool` | `withTransaction()` | ✅ interactive |

HTTP is stateless — each query is one `fetch()`. That means there's no connection
pinned to a request, so a single client can be created once and shared by every
request. It's the simplest possible setup and covers the vast majority of queries.

The catch: the HTTP driver **cannot do interactive transactions** (read a row,
branch on it, then write). Those need a real session, which only the WebSocket
transport provides — so transactions get their own short-lived connection.

## The pieces

| File | Responsibility |
|---|---|
| [`db/client.ts`](../apps/web/db/client.ts) | Builds the HTTP client and the WS transaction pool; dev proxy config. |
| [`db/index.ts`](../apps/web/db/index.ts) | `getDb()` (HTTP singleton) and `withTransaction()` (WS). |

### `getDb()` — non-transactional queries

```ts
import { getDb } from "@/db";

export async function getBoards(organizationId: string) {
  const db = getDb();                       // shared HTTP client
  return db.query.feedbackBoards.findMany({
    where: eq(feedbackBoards.organizationId, organizationId),
    columns: { id: true, name: true, slug: true },
  });
}
```

- The client is created once and reused for the life of the isolate.
- Nothing to open or close. Each query is an independent HTTPS request to Neon.
- Works anywhere the Worker runs, including background work in `waitUntil`.
- better-auth uses this too — its Drizzle adapter runs sequentially, no real
  transactions, so HTTP is a perfect fit.

### `withTransaction()` — atomic multi-statement writes

```ts
import { withTransaction } from "@/db";

const { voteCount } = await withTransaction(async (tx) => {
  await tx.insert(votes).values({ … });
  const [row] = await tx
    .update(feedbackPosts)
    .set({ voteCount: sql`vote_count + 1` })
    .where(eq(feedbackPosts.id, postId))
    .returning({ voteCount: feedbackPosts.voteCount });
  return { voteCount: row.voteCount };
});
```

`withTransaction` opens a WebSocket pool, runs the callback inside a real
transaction, and closes the pool in a `finally`. The `tx` handle is a normal
Drizzle transaction — use it exactly like `db`.

> **Two rules for transaction bodies:**
> 1. **Use `tx` for every query inside** — never call `getDb()` in a transaction.
>    `getDb()` runs over HTTP, on a *different connection*, so its writes are NOT
>    part of the transaction and won't roll back.
> 2. **Pure DB work only** — no `fetch()` / external API calls inside a `tx`. Do
>    that work before or after (e.g. in `waitUntil`).

## Background work (after the response)

Because the HTTP client is stateless, background jobs need no special DB setup —
just call `getDb()` inside the `waitUntil` callback:

```ts
waitUntil(context, (async () => {
  await fireAutoCreateIntegrations(/* uses getDb() internally */);
})());
```

(Contrast with the old design, which had to open a fresh request-scoped pool for
background work — no longer needed.)

## Local development

Neon's driver expects Neon's cloud endpoints, so locally we put two proxies in
front of the docker Postgres (see [docker-compose.yml](../docker/docker-compose.yml)):

| Proxy | Port | Serves | For |
|---|---|---|---|
| `neon-http-proxy` (local-neon-http-proxy) | 4444 | Neon `/sql` HTTP endpoint | `getDb()` |
| `neon-proxy` (wsproxy) | 5433 | Neon WebSocket | `withTransaction()` |

`db/client.ts` points the driver at these in dev (via `neonConfig.fetchEndpoint`
and `neonConfig.wsProxy`) when `ENVIRONMENT === "development"`. `DATABASE_URL`
uses `localhost`, whose ports map to: `5432` → Postgres (migrations/scripts),
`5433` → wsproxy, `4444` → http proxy. `docker compose up` starts all three.

## Migrations & scripts (unchanged, and separate)

`drizzle-kit` migrations and `seed`/`nuke` run in **Node/CI**, not the Worker.
They connect **directly to Postgres over TCP** via `DATABASE_URL` (`db/config.ts`)
using `pg` — they do not touch the neon drivers or the proxies (locally they hit
`localhost:5432` directly).

> Migrations are handled manually by the team — do not run `drizzle-kit generate`
> or edit `_journal.json`.

## Mental model in one line

> `getDb()` = shared stateless HTTP client for everything; `withTransaction()` =
> a throwaway WebSocket connection for the rare interactive transaction. Pick the
> second only when you need multiple statements to commit or roll back together.

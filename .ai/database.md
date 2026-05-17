# Database Rules (Drizzle ORM)

## DB Access

Use `getDb()` from `@/db`. It returns a singleton Drizzle client.

```ts
import { getDb } from "@/db"

const db = getDb()
```

Do NOT import `db` as a module-level constant into service files — always call `getDb()` inside the function so the connection is resolved at runtime, not module load time.

## Schema Conventions

```ts
// Primary keys: CUID2
id: varchar("id", { length: 128 }).primaryKey().$defaultFn(() => createId())

// Timestamps: always include both, auto-managed
createdAt: timestamp("created_at").notNull().defaultNow(),
updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdateFn(() => new Date()),

// Organization scope: all app tables carry this
organizationId: varchar("organization_id", { length: 36 }).notNull()
```

## Query Style: Relational vs Chain

Prefer `db.query.*` (relational API) for single-record lookups with simple conditions:

```ts
// Good for single records
const post = await db.query.feedbackPosts.findFirst({
  where: and(eq(feedbackPosts.id, id), eq(feedbackPosts.organizationId, orgId)),
  columns: { id: true, title: true, status: true }, // always specify columns
})
```

Use `db.select()` chains for joins, aggregates, and group-bys:

```ts
// Good for aggregates
const counts = await db
  .select({ postId: comments.postId, count: sql<number>`count(*)`.mapWith(Number) })
  .from(comments)
  .where(inArray(comments.postId, postIds))
  .groupBy(comments.postId)
```

Never mix both styles on the same query.

## Preventing N+1 Queries

**Bad — N+1:**
```ts
const posts = await db.query.feedbackPosts.findMany(...)
for (const post of posts) {
  post.voteCount = await db.select()...where(eq(votes.postId, post.id)) // N queries!
}
```

**Good — batch with Promise.all:**
```ts
const postIds = posts.map(p => p.id)
const [allVotes, commentCounts] = await Promise.all([
  db.query.votes.findMany({ where: inArray(votes.postId, postIds) }),
  db.select({ postId: ..., count: ... }).from(comments).where(inArray(...)).groupBy(...),
])
// then map/join in memory
```

Always batch related queries with `Promise.all`. Never query inside a loop.

## Always Scope to Organization

Every query on app data MUST include `organizationId` in the where clause:

```ts
// Good
where: and(eq(feedbackPosts.id, id), eq(feedbackPosts.organizationId, orgId))

// Bad — missing org scope, leaks cross-tenant data
where: eq(feedbackPosts.id, id)
```

This is a security requirement, not just a performance one.

## Returning Clauses

When inserting and needing the created record, use `.returning()` to avoid a second query:

```ts
const [post] = await db
  .insert(feedbackPosts)
  .values({ ... })
  .returning({ id: feedbackPosts.id, title: feedbackPosts.title })
// Only return the columns you need
```

## Serializing Dates

Drizzle returns `Date` objects. Serialize to ISO strings before returning from loaders:

```ts
// In queries.ts or service.ts
return {
  ...post,
  createdAt: post.createdAt.toISOString(),
  updatedAt: post.updatedAt.toISOString(),
}
```

Don't do this ad-hoc in route files — do it once at the query/service boundary.

## Migrations

Migration files live in `db/migrations/`. Generate with:
```bash
pnpm db:generate   # creates migration file from schema changes
pnpm db:push       # applies to dev DB
```

Never edit migration files manually after they've been applied to any environment.
One schema change = one migration. Don't batch unrelated changes.

## Null Safety

Drizzle columns are nullable by default. Be explicit:

```ts
// If the field is always present, add .notNull()
title: varchar("title", { length: 255 }).notNull()

// If nullable, handle null in queries — never assume truthy
const name = authorRow?.name ?? authorRow?.email ?? "Unknown"
```

Don't silence nullable types with `!` assertions unless you've already checked for null.

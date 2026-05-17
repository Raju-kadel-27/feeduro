# Performance Rules

## Database Queries

### Always specify columns — never SELECT *
```ts
// Bad — fetches every column including heavy text fields
const post = await db.query.feedbackPosts.findFirst({
  where: eq(feedbackPosts.id, id),
})

// Good — fetch only what the caller needs
const post = await db.query.feedbackPosts.findFirst({
  where: eq(feedbackPosts.id, id),
  columns: { id: true, title: true, status: true, boardId: true },
})
```

### Filter on the DB, not in JS
```ts
// Bad — fetches all org votes then JS-filters per post
const allVotes = await db.query.votes.findMany({
  where: eq(votes.organizationId, orgId),
})
const postVotes = allVotes.filter(v => v.postId === post.id) // in-memory

// Good — filter at the query level
const postVotes = await db.query.votes.findMany({
  where: and(eq(votes.postId, post.id), eq(votes.organizationId, orgId)),
})
```

### Use COUNT aggregates instead of fetching rows to count
```ts
// Bad — fetches all rows just to count
const votes = await db.query.votes.findMany({ where: eq(votes.postId, id) })
const count = votes.length

// Good — single aggregate query
const [{ count }] = await db
  .select({ count: sql<number>`count(*)`.mapWith(Number) })
  .from(votes)
  .where(eq(votes.postId, id))
```

### Paginate large result sets
Never load unbounded lists. Use cursor-based pagination for feeds:

```ts
// Cursor pagination (preferred — stable under inserts)
const posts = await db.query.feedbackPosts.findMany({
  where: and(
    eq(feedbackPosts.organizationId, orgId),
    cursor ? lt(feedbackPosts.createdAt, cursor) : undefined,
  ),
  orderBy: [desc(feedbackPosts.createdAt)],
  limit: PAGE_SIZE + 1, // +1 to detect hasNextPage
})

// Offset pagination (simpler, acceptable for small datasets < 10k rows)
.limit(PAGE_SIZE).offset(page * PAGE_SIZE)
```

### Batch parallel queries with Promise.all
```ts
// Good — all independent queries run in parallel
const [posts, boards, memberRecord] = await Promise.all([
  getPosts(db, orgId),
  getBoards(db, orgId),
  getMember(db, orgId, userId),
])
```

Never `await` independent queries sequentially.

### Use inArray for batch lookups
```ts
// Bad — N queries
for (const id of postIds) {
  const comments = await db.query.comments.findMany({ where: eq(comments.postId, id) })
}

// Good — 1 query
const allComments = await db.query.comments.findMany({
  where: inArray(comments.postId, postIds),
})
```

---

## Bundle Size & Code Splitting

### How RR7 splits bundles automatically
React Router v7 creates a separate JS chunk for every route file. This means route-level
code splitting is free — but ONLY if you don't eagerly import heavy libraries at the top
of a route file that's used everywhere.

If you import a 200 KB library at the top of `dashboard.tsx`, every user pays that cost
on first load even if the feature is rarely used.

### Lazy-load heavy components with React.lazy

```tsx
// Bad — BlockNote editor downloaded with every page load
import { BlockNoteEditor } from "~/features/changelog/components/BlockNoteEditor"

// Good — only downloaded when the component actually renders
const BlockNoteEditor = lazy(() =>
  import("~/features/changelog/components/BlockNoteEditor")
)

// Wrap the usage in Suspense
<Suspense fallback={<Skeleton className="h-64 w-full" />}>
  <BlockNoteEditor ... />
</Suspense>
```

**Candidates in this project that MUST be lazy loaded:**
- `@blocknote` editor — changelog create/edit pages only
- `@dnd-kit` board/drag components — boards view only
- Integration settings panels (Linear, Jira, Asana, GitHub) — settings pages only
- `PostDetailPanel` slide-over — only rendered when a post is opened

### Lazy-load heavy third-party libraries via dynamic import

For code paths that aren't tied to a React component (e.g. initializing a library on
a user action):

```ts
// Bad — full library in the initial bundle
import confetti from "canvas-confetti"
confetti()

// Good — loaded only when actually triggered
async function celebrate() {
  const { default: confetti } = await import("canvas-confetti")
  confetti()
}
```

### Named imports — never import entire packages

Lucide-react and date-fns are tree-shakeable. Always use named imports:

```ts
// Good — only the used icons are bundled
import { ChevronUp, MessageSquare, Plus } from "lucide-react"

// Bad — entire icon library in the bundle
import * as Icons from "lucide-react"
```

### Avoid barrel re-exports in hot paths

Barrel files (`index.ts` that re-exports everything) defeat tree-shaking in Vite/Rollup
because the bundler must include all exports to resolve the import.

```ts
// Bad — if components/index.ts re-exports 30 components, all 30 end up in the bundle
import { PostRow } from "~/components"

// Good — direct import, only PostRow is bundled
import { PostRow } from "~/features/feedback/components/PostRow"
```

Never create `index.ts` barrel files for UI components.

### Split large route files into separate feature chunks

When a route imports many heavy components, split the heavy parts into a feature
sub-module so Vite can create a separate chunk for them:

```ts
// dashboard.tsx — thin route, minimal imports
const FeedbackBoard = lazy(() => import("~/features/feedback/components/FeedbackBoard"))
const PostDetailPanel = lazy(() => import("~/features/feedback/components/PostDetailPanel"))
```

This way the core dashboard shell loads fast; heavy panels load on demand.

---

## React / UI Performance

### Derive computed values with useMemo
Expensive array transforms (filter, sort, group, map) must be memoized:

```ts
const filteredPosts = useMemo(
  () => posts.filter(p => p.status === statusFilter),
  [posts, statusFilter],
)
```

Don't recalculate on every render.

### Keep component scope small
Large components re-render expensive subtrees. Extract leaf components that
only re-render when their specific props change.

```ts
// Bad — whole page re-renders when any post changes
export default function Dashboard() {
  // 500 lines including PostRow, BoardCard, FilterStrip...
}

// Good — each sub-component owns its re-render scope
<FilterStrip sort={sort} ... />
<ListView posts={sortedPosts} ... />
```

### Avoid creating new objects/arrays in JSX
```ts
// Bad — new array reference every render, breaks memoization
<Component items={posts.filter(p => p.status === "open")} />

// Good — memoized reference is stable
const openPosts = useMemo(() => posts.filter(...), [posts])
<Component items={openPosts} />
```

### Use `key` correctly in lists
Always use a stable unique ID as the key — never array index:
```tsx
// Bad
{posts.map((p, i) => <PostRow key={i} ... />)}

// Good
{posts.map(p => <PostRow key={p.id} ... />)}
```

### Use React.memo for stable list-item components
List items that receive the same props should not re-render when siblings change:

```tsx
// PostRow renders inside a long list — memo prevents re-render on unrelated state changes
const PostRow = memo(function PostRow({ post, onOpen }: PostRowProps) {
  return (...)
})
```

Use `memo` when:
- The component is a list item
- The component is expensive to render (has deep subtrees)
- The parent re-renders frequently (search input, sort state)

Don't `memo` everything — only components where re-render cost is measurable.

### Stabilize callbacks with useCallback

Memoized child components break if their handler props are recreated every render:

```tsx
// Bad — new function reference every render, memo on PostRow is wasted
<PostRow onOpen={(id) => setSelectedPostId(id)} />

// Good — stable reference, memo works correctly
const handleOpen = useCallback((id: string) => setSelectedPostId(id), [])
<PostRow onOpen={handleOpen} />
```

Only needed when the handler is passed to a `memo`-wrapped child or a `useEffect` dep.

### Split context providers by update frequency
A context re-renders every consumer when its value changes. Don't bundle
fast-changing state (selected post, search query) with slow-changing state (org, user):

```tsx
// Bad — typing in search re-renders every component reading OrgContext
const OrgContext = createContext({ org, user, searchQuery, selectedPost })

// Good — separate contexts by how often they change
<OrgProvider>        {/* changes rarely — org/user */}
  <UIStateProvider>  {/* changes often — selected post, panels */}
    {children}
  </UIStateProvider>
</OrgProvider>
```

### Debounce search inputs before filtering or fetching

```tsx
const [inputValue, setInputValue] = useState("")
const [searchQuery, setSearchQuery] = useState("")

// Debounce — only update the query that triggers filtering after 300ms idle
useEffect(() => {
  const t = setTimeout(() => setSearchQuery(inputValue), 300)
  return () => clearTimeout(t)
}, [inputValue])

// inputValue drives the controlled input (instant)
// searchQuery drives the expensive filter (debounced)
```

Don't filter a large post list on every keystroke.

### Virtualize long lists
When a list can grow beyond ~100 items, don't render all rows to the DOM.
Use `@tanstack/react-virtual` for windowed rendering:

```tsx
import { useVirtualizer } from "@tanstack/react-virtual"

const rowVirtualizer = useVirtualizer({
  count: posts.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 64, // estimated row height in px
})
```

Only the visible rows are mounted — the rest are virtual.

---

## API / Loader Design

### Return only what the page needs
Loaders that return large objects slow down the initial HTML payload:

```ts
// Bad — returns full DB records with all columns
return { posts: await db.query.feedbackPosts.findMany(...) }

// Good — project to the shape the UI actually uses
return {
  posts: rawPosts.map(p => ({
    id: p.id, title: p.title, status: p.status,
    voteCount: p.voteCount, createdAt: p.createdAt.toISOString(),
  }))
}
```

### Co-locate loaders with their data needs
If a page needs data, load it in the route loader — not inside a component via a separate fetch on mount (waterfall). The TQ + loader hybrid used here is intentional; seed from loader, refresh client-side.

### Avoid re-fetching what you already have
Pass `initialDataUpdatedAt: loaderData.fetchedAt` in TanStack Query so cached loader data
isn't immediately considered stale. Only refetch after the configured `staleTime`.

---

## Cloudflare / Edge

### Avoid heavy work at module level
Module-level code runs on every cold start. Keep top-level code to imports and constants only.

```ts
// Bad — runs on cold start
const config = await fetchRemoteConfig() // top level async

// Good — run lazily inside request handlers
export async function loader() {
  const config = await fetchRemoteConfig()
}
```

### Use appropriate cache headers for public data
Public board data and changelogs don't change per-user. Set cache headers:

```ts
return data(publicData, {
  headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
})
```

Don't set cache headers on authenticated/org-scoped responses.

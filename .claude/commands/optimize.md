# Performance Optimization

**Usage:** `/optimize [page name or route]`

First, ask the user: **"Which page or route do you want to optimize?"** — unless a page name was passed as an argument, in which case use that directly.

Once you have the page name, locate all relevant files: the route handler, loaders, server functions, and client-side components for that page. Then perform a comprehensive performance audit and apply fixes.

---

Act as a senior staff software engineer and perform a comprehensive performance optimization of this codebase, focusing on **backend, loaders, database, and client-side performance** for the specified page.

Your goal is to reduce response times, minimize unnecessary work, and improve scalability **without changing application behavior**.

## Areas to optimize

### 1. Database

* Optimize slow queries.
* Eliminate N+1 queries.
* Fetch only required columns (never SELECT *).
* Push filtering, sorting, pagination, and aggregation to the database — not JS.
* Reduce duplicate queries within the same request.
* Use joins efficiently instead of multiple round trips where appropriate.
* Recommend any missing indexes.
* Batch queries with `Promise.all` + `inArray` where applicable.
* Scope all queries to `organizationId` (missing org scope leaks cross-tenant data).

### 2. Loaders / API / Backend

* Return only the data the client actually needs — remove unused fields.
* Remove redundant or duplicated requests.
* Execute independent queries in parallel using `Promise.all`.
* Eliminate sequential `await` chains where parallelism is safe.
* Cache expensive computations where appropriate within the request lifecycle.
* Remove blocking operations from the critical path.
* Reduce serialized payload size.

### 3. Client-side

* Reduce unnecessary re-renders.
* Memoize expensive computations with `useMemo`; move filter/sort/group out of inline JSX.
* Optimize React hooks and state updates.
* Remove unnecessary `useEffect` calls.
* Lazy-load heavy components (`React.lazy` + `Suspense`) — especially BlockNote, DnD board, integration panels, large modals.
* Debounce search/filter inputs — never filter large lists on every keystroke.
* Avoid unnecessary network requests from the client.

### 4. Data Fetching

* Prevent over-fetching — loader should not return data the page doesn't render.
* Prevent duplicate requests within the same render cycle.
* Reuse cached loader data where React Router provides it.
* Batch requests when appropriate.

### 5. General Code Quality

* Remove dead code and unused imports.
* Simplify expensive logic.
* Avoid repeated computations in loops or renders.
* Follow Drizzle ORM best practices (always specify `columns:`, avoid `SELECT *`).

---

## Constraints

* Do NOT change existing functionality.
* Do NOT introduce breaking changes.
* Preserve all business logic.
* Keep the code readable and maintainable.
* Prefer measurable improvements over micro-optimizations.

---

## Deliverables

For every optimization applied:

1. **Issue** — what the performance problem is.
2. **Root cause** — why it is slow.
3. **Fix** — show the improved implementation.
4. **Impact** — estimate: Low / Medium / High.
5. **Trade-offs** — any risks or caveats.

At the end, provide:

* A prioritized list of all optimizations from highest to lowest impact.
* Any remaining bottlenecks that were not addressed (and why).
* Additional recommendations for scaling this page.
* A summary of expected improvements across: latency, database load, network payload, memory usage, and frontend rendering performance.

Focus on **high-impact optimizations first**, not cosmetic refactoring.

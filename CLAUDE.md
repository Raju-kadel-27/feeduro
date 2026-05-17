# Feediyo — Claude Project Instructions

## Stack
- React Router v7 (framework mode, file-based routing)
- Cloudflare Workers + Neon Postgres (serverless) via Drizzle ORM
- TypeScript, Tailwind CSS, shadcn/ui
- Biome for linting/formatting
- pnpm workspaces

## Architecture
This is a **modular monolith** SaaS app (feedback boards / changelog).

Always read `.ai/architecture.md` before creating or moving files.

### Target structure
```
app/
├── routes/          # Thin route handlers only
├── features/        # Business domains (feedback, boards, changelog, auth…)
├── components/      # Global reusable UI only
├── lib/             # Infrastructure (db, auth, sessions)
├── server/          # Shared server utilities
├── hooks/           # Global React hooks
├── styles/
├── utils/           # Truly cross-cutting utilities only
└── types/           # Global type definitions
```

### Current state → target
The codebase is **migrating** toward the above. Existing code may not yet follow it.
- `app/lib/github|linear|jira|asana` → should move to `app/services/<name>/`
- `app/components/<domain>` → should move to `app/features/<domain>/components/`
- New code MUST follow the target structure, even if surrounding code doesn't yet.

## Non-negotiable rules
1. **Routes must be thin.** No DB logic, no workflows, no external API calls in route handlers.
2. **Feature logic lives in `features/<name>/server/`.** See `.ai/architecture.md`.
3. **External integrations live in `services/<name>/`.** See `.ai/integrations.md`.
4. **Max 300 lines per file.** Split if larger. `dashboard.tsx` is the canonical example of what NOT to do — 600+ lines mixing types, helpers, and components in a route file.
5. **No vague file names** — no `helpers.ts`, `common.ts`, `utils.ts` inside features.
6. **Biome** is the formatter/linter. Run `pnpm biome check` before declaring done.
7. **Never cast request body with `as string`** — always parse with Zod. See `.ai/react-router.md`.
8. **Always scope DB queries to `organizationId`** — missing org scope leaks cross-tenant data.
9. **No N+1 queries** — batch with `Promise.all` + `inArray`. See `.ai/database.md`.
10. **Always specify `columns` in Drizzle queries** — never SELECT *. See `.ai/performance.md`.
11. **Filter and aggregate on the DB, not in JS** — no `.filter()` on results that should be WHERE clauses. See `.ai/performance.md`.
12. **Memoize expensive UI computations** — filter/sort/group in `useMemo`, not inline JSX. See `.ai/performance.md`.
13. **Lazy-load heavy components** — `React.lazy` + `Suspense` for BlockNote editor, DnD board, integration panels, PostDetailPanel. See `.ai/performance.md`.
14. **No barrel `index.ts` files for UI components** — direct imports only; barrels defeat tree-shaking.
15. **Debounce search/filter inputs** — never filter large lists on every keystroke.
16. **Use Zod schemas, never plain interfaces, for domain types** — define schemas in `features/<name>/schemas/`, derive types via `z.infer<typeof Schema>`. Parse all API responses with `.safeParse()` instead of `as SomeType` casts.
17. **Write optimized server-side code** — batch concurrent independent requests with `Promise.all`; never fire sequential awaits when calls are independent.
18. **Wrap multiple mutations in a transaction** — any action/service that performs more than one INSERT/UPDATE/DELETE must use `db.transaction(async (tx) => { … })` for atomicity. No partial writes.
19. **No redundant external API calls** — reuse or cache results within the same request lifecycle; never call an external API twice for the same data in one handler.

## Feature phase tracking
Multi-phase features track their roadmap in `.ai/todos/<feature>.md`. Check there before adding to an existing feature to understand what is planned for future phases.

## Quick reference
- `.ai/architecture.md` — feature module layout, naming, import rules
- `.ai/backend.md` — queries / mutations / service / permissions pattern
- `.ai/frontend.md` — component rules, hooks, form patterns
- `.ai/integrations.md` — external service structure, webhooks, OAuth
- `.ai/react-router.md` — RR7 file conventions, typed routes, intent actions, error boundaries, TQ hybrid pattern
- `.ai/database.md` — Drizzle query style, N+1 prevention, org scoping, migrations
- `.ai/performance.md` — query optimization, pagination, React memoization, loader payload size, Cloudflare edge rules

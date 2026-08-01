# Feeduro

Feeduro is a SaaS feedback management platform. It gives teams a public-facing portal for collecting feature requests and bug reports, a changelog to communicate updates, and a roadmap to track what's being built — all under a custom domain.

## Monorepo structure

This is a **Turborepo + pnpm** workspace. All packages share a single `node_modules` at the root.

```
apps/
  web/               ← React Router v7 app, deployed to Cloudflare Workers
packages/
  react/             ← @feeduro/react   — embeddable React widget SDK
  data-access/       ← @feeduro/data-access — shared DB query helpers
  errors/            ← @feeduro/errors  — shared error types
```

### `apps/web` layout

```
app/
  routes/            ← Thin file-based route handlers (React Router v7)
  features/          ← Business domains (feedback, changelog, billing, widget…)
  components/        ← Global reusable UI primitives
  lib/               ← Infrastructure (auth, sessions)
  server/            ← Shared server utilities
  hooks/             ← Global React hooks
  utils/             ← Cross-cutting utilities
  types/             ← Global TypeScript types
db/
  schema/            ← Drizzle schema definitions
  migrations/        ← SQL migration files
  seed.ts            ← Seed script
public/
  sdk/v1/fdy.js      ← Built JS embed snippet
```

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React Router v7 (framework mode) |
| Runtime | Cloudflare Workers |
| Database | Neon Postgres (serverless) via Drizzle ORM |
| Auth | Better Auth |
| Payments | DodoPay |
| UI | Tailwind CSS + shadcn/ui + Radix UI |
| State | TanStack Query + Legend State |
| Tooling | Vite, Wrangler, Biome, TypeScript |
| Monorepo | Turborepo + pnpm workspaces |

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 10 — `npm install -g pnpm`
- **Docker** — used for the local Postgres instance
- **Wrangler** — installed automatically via devDependencies

## Local development setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp apps/web/.dev.vars.example apps/web/.dev.vars
```

Required variables include database connection strings, Cloudflare account details, Stripe/DodoPay keys, and auth secrets.

### 3. Start the local database

```bash
cd apps/web
pnpm docker:up
```

This starts a Postgres container using the credentials from `.dev.vars`.

### 4. Apply migrations

```bash
cd apps/web
pnpm db:migrate
```

### 5. (Optional) Seed the database

```bash
cd apps/web
pnpm db:seed
```

### 6. Start the dev server

From the repo root:

```bash
pnpm dev
```

The app runs at `https://localhost:3000` (self-signed SSL via `@vitejs/plugin-basic-ssl`).

To expose the local server over a tunnel (e.g. for webhook testing):

```bash
cd apps/web
pnpm dev:tunnel
```

## Key scripts

All scripts below can be run from the **repo root** unless noted.

| Command | Description |
|---|---|
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build (all packages) |
| `pnpm typecheck` | Full TypeScript type check |
| `pnpm lint` | Run Biome checks |
| `pnpm lint:fix` | Auto-fix lint issues |

### `apps/web` specific

```bash
cd apps/web

pnpm db:push          # Push schema changes to local DB (no migration file)
pnpm db:migrate       # Apply pending migrations
pnpm db:studio        # Open Drizzle Studio (visual DB explorer)
pnpm db:seed          # Seed the database
pnpm db:nuke          # Drop and recreate all tables (destructive)
pnpm docker:up        # Start local Postgres via Docker Compose
pnpm docker:down      # Stop local Postgres
```

## Deployment

Deployments target **Cloudflare Workers** via Wrangler.

| Command | Target |
|---|---|
| `pnpm deploy:preview` | Upload a version preview (no traffic) |
| `pnpm deploy:production` | Deploy to production |

Production secrets (e.g. `DATABASE_URL`) must be set via:

```bash
wrangler secret put DATABASE_URL --env production
```

The production worker uses **Neon HTTP** for reads (no TCP handshake) and **Hyperdrive + postgres.js** for writes/transactions. Smart Placement is enabled so the worker runs near the database.

## Packages

### `@feeduro/react`

The embeddable React widget SDK. Lets product teams drop a feedback widget into any React app using an org token and board slug.

```tsx
import { FeeduWidget } from "@feeduro/react";

<FeeduWidget orgToken="<token>" boardSlug="<slug>" />
```

### `@feeduro/data-access`

Shared, typed DB query helpers used by both the web app and other internal tooling.

### `@feeduro/errors`

Shared error class definitions for consistent error handling across packages.

## Branch & PR workflow

1. Branch off `main`:
   ```bash
   git checkout -b feat/your-feature
   ```
2. Make your changes, following the code conventions below.
3. Run checks before opening a PR:
   ```bash
   pnpm lint:fix
   pnpm typecheck
   ```
4. Push and open a Pull Request against `main`:
   ```bash
   git push -u origin feat/your-feature
   ```

## Code conventions

- **Routes are thin** — no DB logic or external API calls inside route handlers.
- **Feature logic lives in `features/<name>/server/`.**
- **External integrations live in `services/<name>/`.**
- **Max 300 lines per file** — split if larger.
- **Always scope DB queries to `organizationId`** to prevent cross-tenant data leaks.
- **No N+1 queries** — batch with `Promise.all` + `inArray`.
- **Always specify `columns` in Drizzle queries** — never `SELECT *`.
- **Parse all input with Zod** — never cast request bodies with `as`.
- **Wrap multiple mutations in a transaction** — use `db.transaction(async (tx) => { … })`.
- Biome is the formatter and linter — run `pnpm lint:fix` before committing.

---

Made with ❤️ by the Feeduro team.

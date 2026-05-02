# Feediyo
Feediyo is a public feedback board web app for collecting, voting, and tracking feature requests.

## Project overview

- `app/` - main application routes, UI, and Cloudflare Workers entry points
- `components/` - reusable components, auth flows, feedback board UI, and layout pieces
- `db/` - Drizzle schema, migrations, seeds, and database tooling
- `public/` - static assets and generated SDK files
- `packages/react/` - local React package used by the project

This project uses `pnpm`, `vite`, `biome`, Tailwind CSS, Cloudflare Workers, and Drizzle ORM.

## Quick setup

### 1. Install packages
```bash
pnpm install
```

### 2. Configure environment
Create or update `.env.dev` with your local environment values for database, Cloudflare, Stripe, and auth.

### 3. Start development
```bash
pnpm dev
```

### 4. Build
```bash
pnpm build
```

### 5. Lint and format
```bash
pnpm lint
pnpm lint:fix
pnpm format
```

## Database commands

```bash
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed
pnpm run db:studio
```

## Deployment

```bash
pnpm run deploy
```

For environment-specific deploys:
```bash
pnpm run deploy:staging
pnpm run deploy:prod
```

## Key scripts

- `pnpm dev` - run dev server
- `pnpm build` - production build
- `pnpm lint` - run biome checks
- `pnpm lint:fix` - auto-fix lint issues
- `pnpm format` - format all files
- `pnpm test` - placeholder test command

## Notes for contributors

- The public feedback board route is in `app/routes/public.$orgSlug.tsx`
- UI primitives live under `app/components/ui/`
- Feedback-specific components are under `app/components/feedback/`
- Cloudflare entry points are in `app/entry.client.tsx`, `app/entry.server.tsx`, and `app/entry.worker.ts`
- Database schema and migrations are managed in `db/`

## Branch & PR workflow

1. Create a feature branch:
```bash
git checkout -b feat/your-feature
```
2. Push the branch:
```bash
git push -u origin feat/your-feature
```
3. Open a Pull Request on GitHub from your branch into `main`.

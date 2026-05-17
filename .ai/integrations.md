# Integration Rules

## Location

Integration-specific code lives in `app/features/integrations/<name>/`.
Truly reusable service adapters (shared OAuth helpers, email, billing) live in `app/services/`.

```
features/integrations/
├── github/
│   ├── server/
│   │   ├── types.ts     # Zod schemas for API response types + settings
│   │   ├── oauth.ts     # OAuth flow (authorize URL, token exchange, refresh)
│   │   ├── client.ts    # API client, auth headers, base fetch wrapper
│   │   └── service.ts   # Loader + action handlers (orchestration)
│   └── schemas/
│       └── index.ts     # Zod schemas for route action inputs
├── linear/              # Same structure — migrate from lib/linear/ when touched
├── jira/                # Same structure — migrate from lib/jira/ when touched
├── asana/               # Same structure — migrate from lib/asana/ when touched
└── server/              # Shared across ALL integrations
    ├── queries.ts        # getIntegration, getIntegrationToken, getOrgSlugFromId
    ├── mutations.ts      # upsertIntegrationToken, updateSettings, postExternalLinks ops
    ├── permissions.ts    # requireAdminRole
    └── loader.ts         # integrations page loader

services/
└── oauth/
    └── state.server.ts  # buildOAuthState / parseOAuthState — reused by every OAuth provider
```

**Do NOT put integration-specific code in `app/lib/<name>/` or `app/services/<name>/`.**

Current migration state:
- `app/lib/linear/` → migrate to `features/integrations/linear/` when touched
- `app/lib/jira/` → migrate to `features/integrations/jira/` when touched
- `app/lib/asana/` → migrate to `features/integrations/asana/` when touched
- `app/services/shortcut/` → migrate to `features/integrations/shortcut/` when touched

## Integration Module Structure

### `server/types.ts`
- Zod schemas for all API response shapes (not plain interfaces)
- Zod schema for the integration's Settings type
- Derive TS types via `z.infer<>`

### `server/oauth.ts`
- Generates authorize URLs
- Handles token exchange
- Handles token refresh (where supported)
- No DB calls — delegates persistence to `features/integrations/server/mutations`

### `server/client.ts`
- Authenticated fetch wrapper (one place for base URL, auth headers, retries)
- Returns typed responses (parse with Zod schemas from `types.ts`)
- No business logic, no DB calls

### `server/service.ts`
- `handleXyzLoader(request)` — handles all loader cases for the route
- `handleXyzAction(request)` — parses body with Zod, dispatches to helpers
- Imports from local `oauth.ts`, `client.ts`, `types.ts` and shared `../../server/`

### `schemas/index.ts`
- Discriminated union of all valid action intents
- Used by `service.ts` to validate `request.json()` — replaces all `as string` casts

## Webhook API Routes

Webhook endpoints live in `app/routes/api+/<name>.webhook.ts`.

They should:
1. Verify the signature (call `features/integrations/<name>/server/webhook.ts`)
2. Dispatch the event
3. Return 200 immediately (async processing if needed)

Never process heavy sync work inline in a webhook handler — use a job queue or background task.

## Secrets / Credentials

All secrets come from `getEnv()` — never hardcode or import from a module-level variable.

```ts
// Good
const env = getEnv()
const token = env.GITHUB_CLIENT_SECRET

// Bad
import { GITHUB_SECRET } from "~/config"
```

## Error Handling

External API calls can fail. Always:
- Catch and log external errors without crashing the app
- Return typed error results rather than throwing in sync flows
- Retry transient failures (network, 5xx) with exponential backoff where appropriate

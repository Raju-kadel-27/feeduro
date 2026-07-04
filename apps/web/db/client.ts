import { neonConfig, Pool } from "@neondatabase/serverless";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

export type Db = NeonDatabase<typeof schema>;

// Workers allow at most 6 concurrent outbound connections per isolate;
// keep one slot free for other potential outbound calls.
const POOL_MAX = 5;
const POOL_CONNECT_TIMEOUT_MS = 5000;

function getDatabaseUrl(): string {
  const url: string | undefined = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

// neonConfig is a module-level singleton; apply local-dev overrides exactly once.
let driverConfigured = false;

function configureDriver(): void {
  if (driverConfigured) return;
  driverConfigured = true;

  // In development, a plain Postgres container does not speak WebSocket, so we point
  // the driver at the wsproxy sidecar (docker-compose neon-proxy on :5433) which
  // translates WS → TCP. This keeps dev and prod on the same driver code path.
  // populated at runtime by nodejs_compat_populate_process_env
  if (process.env.ENVIRONMENT === "development") {
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineConnect = false;
    neonConfig.wsProxy = (host) => `${host}:5433/v1`;
    return;
  }

  // In production the driver connects directly to Neon. Route single-statement
  // pool.query() calls over Neon's HTTP (fetch) transport instead of WebSocket.
  // The WS transport is only needed for interactive transactions (pool.connect /
  // db.transaction), which our app code still uses and which are unaffected by
  // this flag. Non-transactional queries — all of better-auth's, whose Drizzle
  // adapter runs sequentially with no real transaction — over a stalled WS
  // upgrade have no timeout and hang the entire Worker request (e.g. the
  // /api/auth/sign-up/email hang). Fetch is bounded and robust in the Workers
  // runtime, so this removes that failure mode for auth and other single queries.
  neonConfig.poolQueryViaFetch = true;
}

export function createPool(): Pool {
  const url = getDatabaseUrl();
  configureDriver();
  return new Pool({
    connectionString: url,
    max: POOL_MAX,
    connectionTimeoutMillis: POOL_CONNECT_TIMEOUT_MS,
  });
}

export function createDb(pool: Pool): Db {
  return drizzle(pool, { schema });
}

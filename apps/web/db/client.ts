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
  // @ts-expect-error — populated at runtime by nodejs_compat_populate_process_env
  const url: string | undefined = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

// neonConfig is a module-level singleton; apply local-dev overrides exactly once.
let driverConfigured = false;

function configureDriver(url: string): void {
  if (driverConfigured) return;
  driverConfigured = true;

  // In production the driver connects directly to Neon over WSS — nothing to configure.
  // Locally, a plain Postgres container does not speak WebSocket, so we point the
  // driver at the wsproxy sidecar (docker-compose neon-proxy on :5433) which
  // translates WS → TCP. This keeps dev and prod on the same driver code path.
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineConnect = false;
    neonConfig.wsProxy = (host) => `${host}:5433/v1`;
  }
}

export function createPool(): Pool {
  const url = getDatabaseUrl();
  configureDriver(url);
  return new Pool({
    connectionString: url,
    max: POOL_MAX,
    connectionTimeoutMillis: POOL_CONNECT_TIMEOUT_MS,
  });
}

export function createDb(pool: Pool): Db {
  return drizzle(pool, { schema });
}

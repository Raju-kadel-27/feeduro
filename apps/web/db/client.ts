import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// Non-transactional queries run over Neon's stateless HTTP transport.
export type Db = NeonHttpDatabase<typeof schema>;
// Interactive transactions run over a short-lived WebSocket connection.
export type TxDb = NeonDatabase<typeof schema>;

function getDatabaseUrl(): string {
  const url: string | undefined = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

// neonConfig is a module-level singleton; apply local-dev overrides exactly once.
// In production both transports hit Neon's cloud endpoints directly. In dev they
// go through the docker-compose proxies pointed at the local Postgres:
//   HTTP  → local-neon-http-proxy on :4444
//   WS    → wsproxy on :5433
// (host is db.localtest.me, which resolves to 127.0.0.1 — see .dev.vars).
let driverConfigured = false;
function configureDriver(): void {
  if (driverConfigured) return;
  driverConfigured = true;
  if (process.env.ENVIRONMENT !== "development") return;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineConnect = false;
  neonConfig.wsProxy = (host) => `${host}:5433/v1`;
  neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
}

// HTTP client: stateless (each query is one fetch), so it is safe to create once
// and share across every request — no pooling or connection lifecycle.
export function createHttpDb(): Db {
  configureDriver();
  return drizzleHttp(neon(getDatabaseUrl()), { schema });
}

// WebSocket pool for a single transaction. The caller MUST close it — see
// withTransaction() in ./index.ts, which is the only place this is used.
export function createTxPool(): Pool {
  configureDriver();
  return new Pool({ connectionString: getDatabaseUrl(), max: 1 });
}

export function createTxDb(pool: Pool): TxDb {
  return drizzleWs(pool, { schema });
}

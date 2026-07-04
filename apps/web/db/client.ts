import { neon, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// Non-transactional queries run over Neon's stateless HTTP transport.
export type Db = NeonHttpDatabase<typeof schema>;
// Interactive transactions run over a short-lived WebSocket connection.
export type TxDb = NeonDatabase<typeof schema>;

// Env-agnostic factories. The driver's endpoints are configured per-environment
// in index.ts (see driver.dev.ts / driver.prod.ts) before these are called.

function getDatabaseUrl(): string {
  const url: string | undefined = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

// HTTP client: stateless (each query is one fetch), safe to share across requests.
export function createHttpDb(): Db {
  return drizzleHttp(neon(getDatabaseUrl()), { schema });
}

// WebSocket pool for a single transaction. The caller MUST close it — see
// withTransaction() in ./index.ts, the only place this is used.
export function createTxPool(): Pool {
  return new Pool({ connectionString: getDatabaseUrl(), max: 1 });
}

export function createTxDb(pool: Pool): TxDb {
  return drizzleWs(pool, { schema });
}

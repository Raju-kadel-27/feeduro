import { createHttpDb, createTxDb, createTxPool, type Db, type TxDb } from "./client";
import { configureDevDriver } from "./driver.dev";
import { configureProdDriver } from "./driver.prod";

// Configure the neon driver for the current environment exactly once. Lazy on
// purpose: process.env is populated per-request, so this can't run at module load.
let configured = false;
function ensureDriverConfigured(): void {
  if (configured) return;
  configured = true;
  if (process.env.ENVIRONMENT === "development") {
    configureDevDriver();
  } else {
    configureProdDriver();
  }
}

// Non-transactional queries share one stateless HTTP client. Each query is an
// independent fetch, so there is no per-request pool and no connection lifecycle
// to manage — the client is created once and reused for the life of the isolate.
let httpDb: Db | undefined;

export function getDb(): Db {
  if (typeof window !== "undefined") {
    throw new Error("getDb() cannot be called on the client — use an API route instead");
  }
  ensureDriverConfigured();
  httpDb ??= createHttpDb();
  return httpDb;
}

// The `tx` handle passed to a transaction callback.
type Tx = Parameters<Parameters<TxDb["transaction"]>[0]>[0];

/**
 * Runs `fn` inside a real interactive transaction over a short-lived WebSocket
 * connection, which is closed afterwards. Use this for any multi-statement
 * atomic write; use getDb() for everything else.
 *
 * Keep the body pure DB work — do NOT call external APIs or getDb() inside it
 * (getDb() runs over HTTP, outside this transaction, breaking atomicity).
 */
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  ensureDriverConfigured();
  const pool = createTxPool();
  try {
    return await createTxDb(pool).transaction(fn);
  } finally {
    await pool.end().catch(() => {});
  }
}

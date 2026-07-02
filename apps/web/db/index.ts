import { AsyncLocalStorage } from "node:async_hooks";
import { neonConfig, Pool } from "@neondatabase/serverless";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

type Db = NeonDatabase<typeof schema>;

interface RequestDbStore {
  db?: Db;
  pool?: Pool;
}

const requestDbStorage = new AsyncLocalStorage<RequestDbStore>();

const getDatabaseUrl = (): string => {
  // @ts-expect-error process.env is populated by nodejs_compat_populate_process_env
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  return DATABASE_URL;
};

// Against a local Postgres, point the Neon serverless driver at the wsproxy
// container (docker/docker-compose.yml → neon-proxy on :5433) so local dev runs
// the identical WebSocket driver/code path as prod. In prod the URL is a real
// Neon host and the driver connects over WSS with no extra config.
const configureNeonForLocal = (url: string): void => {
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineConnect = false;
    neonConfig.wsProxy = (host) => `${host}:5433/v1`;
  }
};

const createPool = (): Pool => {
  const connectionString = getDatabaseUrl();
  configureNeonForLocal(connectionString);
  return new Pool({
    connectionString,
    max: 5, // Workers allow at most 6 concurrent outbound connections per request
    connectionTimeoutMillis: 5000,
  });
};

// Module-scope fallback used only for schema introspection (e.g. better-auth's
// drizzleAdapter reads db._ at init). Its Pool performs no I/O until a query
// runs, and queries always go through the per-request instance below.
let introspectionDb: Db | undefined;

const resolveDb = (): Db => {
  const store = requestDbStorage.getStore();
  if (store) {
    if (!store.db) {
      store.pool = createPool();
      store.db = drizzle(store.pool, { schema });
    }
    return store.db;
  }
  if (!introspectionDb) {
    introspectionDb = drizzle(createPool(), { schema });
  }
  return introspectionDb;
};

// Workers pin sockets to the request that opened them, so the real drizzle
// instance must be created per request. This proxy defers resolution to call
// time, letting module-scope consumers hold a stable reference.
const dbProxy = new Proxy({} as Db, {
  get(_target, prop) {
    const db = resolveDb();
    const value = Reflect.get(db as object, prop, db);
    return typeof value === "function" ? value.bind(db) : value;
  },
});

export const getDb = (): Db => {
  if (typeof window !== "undefined") {
    throw new Error("Db queries are not allowed on the client. Call the api route instead.");
  }
  return dbProxy;
};

/**
 * Scopes all getDb() usage inside `fn` to a request-local Pool, then closes it
 * once `fn` settles. `scheduleCleanup` should be `ctx.waitUntil` so the pool
 * drains without delaying the response.
 */
export async function withRequestDb<T>(
  scheduleCleanup: (promise: Promise<unknown>) => void,
  fn: () => Promise<T>,
): Promise<T> {
  const store: RequestDbStore = {};
  try {
    return await requestDbStorage.run(store, fn);
  } finally {
    if (store.pool) {
      scheduleCleanup(store.pool.end().catch(() => {}));
    }
  }
}

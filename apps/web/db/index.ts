import { AsyncLocalStorage } from "node:async_hooks";
import { createDb, createPool } from "./client";
import type { Pool } from "@neondatabase/serverless";
import type { Db } from "./client";

interface RequestStore {
  db?: Db;
  pool?: Pool;
}

// Each request gets its own Pool. Workers pin sockets to the request that opened
// them, so connections cannot be shared across requests.
const requestStorage = new AsyncLocalStorage<RequestStore>();

// Module-scope fallback for schema introspection only (e.g. better-auth's
// drizzleAdapter reads db._ during module init, before the first request). No
// application queries go through this — they always use the per-request instance.
let introspectionDb: Db | undefined;

function resolveDb(): Db {
  const store = requestStorage.getStore();
  if (store) {
    if (!store.db) {
      store.pool = createPool();
      store.db = createDb(store.pool);
    }
    return store.db;
  }
  introspectionDb ??= createDb(createPool());
  return introspectionDb;
}

// Stable module-scope reference. Workers create a new Db per request, but
// callers import once and hold this proxy for the lifetime of the module.
// The proxy resolves the actual Db at call time, so it always hits the
// correct per-request instance.
const dbProxy = new Proxy({} as Db, {
  get(_target, prop) {
    const db = resolveDb();
    const value = Reflect.get(db as object, prop, db);
    return typeof value === "function" ? value.bind(db) : value;
  },
});

export function getDb(): Db {
  if (typeof window !== "undefined") {
    throw new Error("getDb() cannot be called on the client — use an API route instead");
  }
  return dbProxy;
}

/**
 * Runs `fn` inside a dedicated request-scoped Pool. All getDb() calls within
 * `fn` share one pool that is closed after `fn` settles. Pass `ctx.waitUntil`
 * as `scheduleCleanup` so pool teardown happens after the response is sent
 * without blocking it.
 */
export async function withRequestDb<T>(
  scheduleCleanup: (p: Promise<unknown>) => void,
  fn: () => Promise<T>,
): Promise<T> {
  const store: RequestStore = {};
  try {
    return await requestStorage.run(store, fn);
  } finally {
    if (store.pool) {
      scheduleCleanup(store.pool.end().catch(() => {}));
    }
  }
}

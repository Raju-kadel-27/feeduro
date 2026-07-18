import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeonHttp, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Hybrid database client.
 *
 * Workers can't keep TCP connections alive across requests, so every request
 * pays the full postgres.js ↔ Hyperdrive connection handshake before its first
 * query — measured at several hundred ms in production. Neon's HTTP driver
 * turns each query into a single stateless HTTPS request with no handshake,
 * which is dramatically faster for the loader read path.
 *
 * Neon's HTTP endpoint has no interactive transactions, so `db.transaction()`
 * still runs over postgres.js + Hyperdrive — only requests that actually open
 * a transaction pay the handshake. postgres.js connects lazily, so requests
 * served entirely over HTTP never open a TCP connection at all.
 *
 * `directUrl` must be the direct Neon connection string. When it is absent or
 * not a Neon host (local docker Postgres in dev), everything falls back to
 * postgres.js — identical to the previous behavior.
 */
export function createDb(
  hyperdriveUrl: string,
  directUrl?: string,
): { db: Db; close: () => Promise<void> } {
  const sql = postgres(hyperdriveUrl, { prepare: false });
  const pgDb = drizzle(sql, { schema });
  const close = () => sql.end();

  if (!directUrl?.includes(".neon.tech")) {
    return { db: pgDb, close };
  }

  const httpDb = drizzleNeonHttp(neon(directUrl), { schema });
  return { db: createHybridDb(pgDb, httpDb), close };
}

function createHybridDb(pgDb: Db, httpDb: NeonHttpDatabase<typeof schema>): Db {
  return new Proxy(httpDb, {
    get(target, prop) {
      // Interactive transactions are not supported over Neon HTTP.
      if (prop === "transaction") return pgDb.transaction.bind(pgDb);

      // postgres.js returns rows as a bare array while neon-http wraps them in
      // a result object — normalize so raw-SQL call sites see the array shape
      // they were written against.
      if (prop === "execute") {
        return async (query: Parameters<Db["execute"]>[0]) => (await target.execute(query)).rows;
      }

      const value = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
    // Runtime-compatible facade: both drivers expose the same drizzle query API
    // over the same schema; only `transaction`/`execute` differ and are bridged
    // above. Typing it as the postgres.js flavor keeps `Db`/`Tx` stable for
    // every consumer.
  }) as unknown as Db;
}

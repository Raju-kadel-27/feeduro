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

  const isNeonHost = directUrl?.includes(".neon.tech") ?? false;
  const mode = isNeonHost ? "hybrid" : "hyperdrive-only";

  console.log(
    JSON.stringify({
      event: "db.init",
      mode,
      hasDirectUrl: !!directUrl,
      isNeonHost,
      // Tells you at a glance why the fast path is/isn't active:
      // "hybrid"        → DATABASE_URL secret is set and is a Neon host → reads use HTTP
      // "hyperdrive-only" → no secret or local docker postgres → all queries use TCP
    }),
  );

  if (!isNeonHost) {
    return { db: pgDb, close };
  }

  const httpDb = drizzleNeonHttp(neon(directUrl!), { schema });
  return { db: createHybridDb(pgDb, httpDb), close };
}

function createHybridDb(pgDb: Db, httpDb: NeonHttpDatabase<typeof schema>): Db {
  return new Proxy(httpDb, {
    get(target, prop) {
      // Interactive transactions are not supported over Neon HTTP — route to
      // postgres.js and log timing so we can see how long TCP mutations take.
      if (prop === "transaction") {
        return (
          callback: Parameters<Db["transaction"]>[0],
          options?: Parameters<Db["transaction"]>[1],
        ) => {
          const t = performance.now();
          return pgDb.transaction(callback, options).then(
            (result) => {
              console.log(
                JSON.stringify({
                  event: "db.transaction",
                  driver: "hyperdrive",
                  dur: Math.round(performance.now() - t),
                  status: "ok",
                }),
              );
              return result;
            },
            (err) => {
              console.log(
                JSON.stringify({
                  event: "db.transaction",
                  driver: "hyperdrive",
                  dur: Math.round(performance.now() - t),
                  status: "error",
                  error: String(err),
                }),
              );
              throw err;
            },
          );
        };
      }

      // postgres.js returns rows as a bare array while neon-http wraps them in
      // a result object — normalize so raw-SQL call sites see the array shape
      // they were written against, and log timing per raw-SQL call.
      if (prop === "execute") {
        return async (query: Parameters<Db["execute"]>[0]) => {
          const t = performance.now();
          try {
            const result = await target.execute(query);
            console.log(
              JSON.stringify({
                event: "db.execute",
                driver: "neon-http",
                dur: Math.round(performance.now() - t),
                rows: result.rows.length,
                status: "ok",
              }),
            );
            return result.rows;
          } catch (err) {
            console.log(
              JSON.stringify({
                event: "db.execute",
                driver: "neon-http",
                dur: Math.round(performance.now() - t),
                status: "error",
                error: String(err),
              }),
            );
            throw err;
          }
        };
      }

      const value = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as unknown as Db;
}

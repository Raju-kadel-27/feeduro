import type { Context } from "hono";
import { createDb } from "@/db";
import type { Env } from "./env";

type DbInstance = ReturnType<typeof createDb>["db"];
const cache = new WeakMap<Hyperdrive, DbInstance>();

export function getDb(c: Context<Env>): DbInstance {
  const hyperdrive = c.env.HYPERDRIVE;
  const cached = cache.get(hyperdrive);
  if (cached) return cached;
  const { db } = createDb(hyperdrive.connectionString, c.env.DATABASE_URL);
  cache.set(hyperdrive, db);
  return db;
}

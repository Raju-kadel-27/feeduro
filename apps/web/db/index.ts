import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export function createDb(connectionString: string): { db: Db; close: () => Promise<void> } {
  const sql = postgres(connectionString, { prepare: false });
  return { db: drizzle(sql, { schema }), close: () => sql.end() };
}

import { neon } from "@neondatabase/serverless";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type AnyDb = NeonHttpDatabase<typeof schema> | NodePgDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __dbInstance: AnyDb | undefined;
}

export const getDb = (): AnyDb => {
  if (typeof window !== "undefined") {
    throw new Error("Db queries are not allowed on the client. Call the api route instead.");
  }

  // @ts-expect-error
  const DATABASE_URL = process.env.DATABASE_URL;
  // @ts-expect-error
  const ENVIRONMENT = process.env.ENVIRONMENT;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  if (!globalThis.__dbInstance) {
    if (ENVIRONMENT === "development") {
      const pool = new Pool({ connectionString: DATABASE_URL, ssl: false });
      globalThis.__dbInstance = drizzlePg(pool, { schema });
    } else {
      const sql = neon(DATABASE_URL);
      globalThis.__dbInstance = drizzleNeon(sql, { schema });
    }
  }

  return globalThis.__dbInstance;
};

// Clear the cached instance when this module is hot-reloaded so the next
// request picks up any connection config changes.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    globalThis.__dbInstance = undefined;
  });
}

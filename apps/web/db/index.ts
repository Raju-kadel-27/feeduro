import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __dbInstance: NodePgDatabase<typeof schema> | undefined;
}

export const getDb = (): NodePgDatabase<typeof schema> => {
  if (typeof window !== "undefined") {
    throw new Error("Db queries are not allowed on the client. Call the api route instead.");
  }

  // @ts-expect-error
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  if (!globalThis.__dbInstance) {
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: false,
      // Prevent indefinite hangs in the Workers runtime — reject instead of hanging.
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    });
    globalThis.__dbInstance = drizzle(pool, { schema });
  }

  return globalThis.__dbInstance;
};

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    globalThis.__dbInstance = undefined;
  });
}

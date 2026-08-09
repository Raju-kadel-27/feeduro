import { defineConfig } from "drizzle-kit";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve paths relative to this config file so drizzle-kit works regardless
// of which directory it is invoked from (apps/web, packages/db, CI, etc.).
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rawUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/feeduro";

const isDevelopment = process.env.ENVIRONMENT === "development";

// Strip sslmode query param when connecting to a local Postgres container
// that does not have SSL configured.
const url = isDevelopment
  ? rawUrl.replace(/([?&])sslmode=[^&]*/g, "$1").replace(/[?&]$/, "")
  : rawUrl;

export default defineConfig({
  out: path.join(__dirname, "migrations"),
  schema: [path.join(__dirname, "src/schema/index.ts")],
  dialect: "postgresql",
  dbCredentials: {
    url,
    ssl: isDevelopment ? false : { rejectUnauthorized: false },
  },
});

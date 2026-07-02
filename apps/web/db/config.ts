import { defineConfig } from "drizzle-kit";

const rawUrl =
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/feeduro";

const isDevelopment = process.env.ENVIRONMENT === "development";

// Strip sslmode query param when connecting to a local Postgres container
// that does not have SSL configured.
const url = isDevelopment
  ? rawUrl.replace(/([?&])sslmode=[^&]*/g, "$1").replace(/[?&]$/, "")
  : rawUrl;

export default defineConfig({
  out: "./db/migrations",
  schema: ["./db/schema/index.ts"],
  dialect: "postgresql",
  dbCredentials: {
    url,
    ssl: isDevelopment ? false : { rejectUnauthorized: false },
  },
});

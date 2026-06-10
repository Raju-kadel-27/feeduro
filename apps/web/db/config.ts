import { defineConfig } from "drizzle-kit";

const rawUrl =
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/feeduro";

const isLocal = rawUrl.includes("localhost") || rawUrl.includes("127.0.0.1");

const url = isLocal ? rawUrl.replace(/([?&])sslmode=[^&]*/g, "$1").replace(/[?&]$/, "") : rawUrl;

export default defineConfig({
  out: "./db/migrations",
  schema: ["./db/schema/index.ts"],
  dialect: "postgresql",
  dbCredentials: {
    url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  },
});

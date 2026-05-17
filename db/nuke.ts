import { Pool } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/feediyo";

const pool = new Pool({ connectionString: DATABASE_URL });

console.log("Nuking database...");

await pool.query("DROP SCHEMA public CASCADE");
await pool.query("CREATE SCHEMA public");
await pool.query("GRANT ALL ON SCHEMA public TO public");

await pool.end();

console.log("Database nuked. Run 'pnpm db:migrate' to re-apply migrations.");

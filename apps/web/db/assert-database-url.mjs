// Fail loudly before running migrations if DATABASE_URL is missing/empty.
// Prevents drizzle-kit from silently falling back to the localhost default in
// config.ts and hanging on a cryptic connection timeout in CI.
if (!process.env.DATABASE_URL) {
  console.error(
    "ERROR: DATABASE_URL is not set — refusing to run migrations.\n" +
      "In CI this comes from the per-branch Neon secret " +
      "(STAGING_DATABASE_URL / PRODUCTION_DATABASE_URL).",
  );
  process.exit(1);
}

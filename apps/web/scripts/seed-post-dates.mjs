/**
 * Redistributes existing feedback_posts createdAt timestamps evenly across
 * July 2025 – June 2026 so the analytics line chart has realistic data.
 *
 * Usage:
 *   node scripts/seed-post-dates.mjs
 *   node scripts/seed-post-dates.mjs --dry-run   # preview only, no writes
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  // The project's env lives in .dev.vars (also used by db:seed + docker).
  const envPath = resolve(__dirname, "../.dev.vars");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] ??= val;
  }
}

loadEnv();

const require = createRequire(resolve(__dirname, "../package.json"));
const { Client } = require("pg");

const DRY_RUN = process.argv.includes("--dry-run");

const START = new Date("2025-07-01T00:00:00.000Z");
const END   = new Date("2026-06-30T23:59:59.999Z");
const RANGE_MS = END.getTime() - START.getTime();

function spreadDates(count) {
  if (count === 0) return [];

  const BUCKETS = 26;
  const bucketMs = RANGE_MS / BUCKETS;

  const weights = Array.from({ length: BUCKETS }, () => Math.pow(Math.random(), 0.6));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const bucketCounts = weights.map((w) => Math.round((w / totalWeight) * count));
  const assigned = bucketCounts.reduce((a, b) => a + b, 0);
  bucketCounts[bucketCounts.length - 1] += count - assigned;

  const dates = [];
  for (let b = 0; b < BUCKETS; b++) {
    const bucketStart = START.getTime() + b * bucketMs;
    for (let i = 0; i < bucketCounts[b]; i++) {
      dates.push(new Date(bucketStart + Math.random() * bucketMs));
    }
  }

  dates.sort((a, b) => a - b);
  return dates;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows: posts } = await client.query(
      `SELECT id FROM feedback_posts ORDER BY created_at ASC`,
    );

    if (posts.length === 0) {
      console.log("No posts found — nothing to update.");
      return;
    }

    const dates = spreadDates(posts.length);

    console.log(`Found ${posts.length} posts.`);
    console.log(`Range: ${START.toISOString()} → ${END.toISOString()}`);
    console.log(`Dry run: ${DRY_RUN}`);
    console.log("─".repeat(50));

    const preview = [
      ...posts.slice(0, 5).map((p, i) => ({ id: p.id, date: dates[i] })),
      ...(posts.length > 5
        ? posts.slice(-5).map((p, i) => ({ id: p.id, date: dates[posts.length - 5 + i] }))
        : []),
    ];
    for (const { id, date } of preview) {
      console.log(`  ${id}  →  ${date.toISOString()}`);
    }
    if (posts.length > 10) console.log(`  … (${posts.length - 10} more)`);

    if (DRY_RUN) {
      console.log("\nDry run — no changes written.");
      return;
    }

    const CHUNK = 500;
    let updated = 0;

    for (let i = 0; i < posts.length; i += CHUNK) {
      const chunk = posts.slice(i, i + CHUNK);
      const cases = chunk
        .map((_, j) => `WHEN id = $${j * 2 + 1} THEN $${j * 2 + 2}::timestamptz`)
        .join("\n        ");
      const ids = chunk.map((p) => p.id);
      const params = chunk.flatMap((p, j) => [p.id, dates[i + j].toISOString()]);

      await client.query(
        `UPDATE feedback_posts
         SET created_at = CASE
           ${cases}
         END
         WHERE id = ANY($${params.length + 1}::text[])`,
        [...params, ids],
      );

      updated += chunk.length;
      process.stdout.write(`\rUpdated ${updated}/${posts.length} posts…`);
    }

    console.log(`\n✓ Done. ${posts.length} posts redistributed across Jul 2025 – Jun 2026.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

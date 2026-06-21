/**
 * Redistributes existing vote createdAt timestamps evenly across
 * July 2025 – June 2026 so the analytics line chart has realistic data.
 *
 * Usage:
 *   node scripts/seed-vote-dates.mjs
 *   node scripts/seed-vote-dates.mjs --dry-run   # preview only, no writes
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Load DATABASE_URL from apps/web/.env
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(__dirname, "../apps/web/.env");
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

// pg lives in apps/web/node_modules — resolve from there
const require = createRequire(resolve(__dirname, "../apps/web/package.json"));
const { Client } = require("pg");

const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
const START = new Date("2025-07-01T00:00:00.000Z");
const END   = new Date("2026-06-30T23:59:59.999Z");
const RANGE_MS = END.getTime() - START.getTime();

/**
 * Distributes `count` timestamps across the range with organic spikes and
 * quiet periods. Divides the year into biweekly buckets, assigns each a
 * random weight (some 3–4× busier than others), then fills each bucket
 * proportionally with random timestamps within it.
 */
function spreadDates(count) {
  if (count === 0) return [];

  const BUCKETS = 26; // ~2 weeks each over 12 months
  const bucketMs = RANGE_MS / BUCKETS;

  // Random weights: square-root keeps extreme outliers rare but spikes still visible
  const weights = Array.from({ length: BUCKETS }, () => Math.pow(Math.random(), 0.6));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Proportional counts per bucket
  const bucketCounts = weights.map((w) => Math.round((w / totalWeight) * count));

  // Fix rounding drift on the last bucket
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Fetch all vote ids in a stable order
    const { rows: votes } = await client.query(
      `SELECT id FROM votes ORDER BY created_at ASC`
    );

    if (votes.length === 0) {
      console.log("No votes found — nothing to update.");
      return;
    }

    const dates = spreadDates(votes.length);

    console.log(`Found ${votes.length} votes.`);
    console.log(`Range: ${START.toISOString()} → ${END.toISOString()}`);
    console.log(`Dry run: ${DRY_RUN}`);
    console.log("─".repeat(50));

    // Preview first and last 5 assignments
    const preview = [
      ...votes.slice(0, 5).map((v, i) => ({ id: v.id, date: dates[i] })),
      ...(votes.length > 5
        ? votes.slice(-5).map((v, i) => ({ id: v.id, date: dates[votes.length - 5 + i] }))
        : []),
    ];
    for (const { id, date } of preview) {
      console.log(`  ${id}  →  ${date.toISOString()}`);
    }
    if (votes.length > 10) {
      console.log(`  … (${votes.length - 10} more)`);
    }

    if (DRY_RUN) {
      console.log("\nDry run — no changes written.");
      return;
    }

    // Batch UPDATE in chunks of 500 to avoid huge param lists
    const CHUNK = 500;
    let updated = 0;

    for (let i = 0; i < votes.length; i += CHUNK) {
      const chunk = votes.slice(i, i + CHUNK);
      // Build a single UPDATE … SET created_at = CASE WHEN … END statement
      const cases = chunk
        .map((v, j) => `WHEN id = $${j * 2 + 1} THEN $${j * 2 + 2}::timestamptz`)
        .join("\n        ");
      const ids = chunk.map((v) => v.id);
      const params = chunk.flatMap((v, j) => [v.id, dates[i + j].toISOString()]);

      await client.query(
        `UPDATE votes
         SET created_at = CASE
           ${cases}
         END
         WHERE id = ANY($${params.length + 1}::text[])`,
        [...params, ids],
      );

      updated += chunk.length;
      process.stdout.write(`\rUpdated ${updated}/${votes.length} votes…`);
    }

    console.log(`\n✓ Done. ${votes.length} votes redistributed across Jul 2025 – Jun 2026.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

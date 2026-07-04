import { eq } from "drizzle-orm";
import { getDb, withTransaction } from "@/db";
import { feedbackPosts, importJobs } from "@/db/schema";

export async function createImportJob(
  organizationId: string,
  source: string,
  createdBy: string,
): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(importJobs)
    .values({ organizationId, source, status: "running", createdBy, startedAt: new Date() })
    .returning({ id: importJobs.id });
  return row.id;
}

export async function completeImportJob(
  jobId: string,
  counts: { total: number; imported: number; failed: number },
): Promise<void> {
  const db = getDb();
  await db
    .update(importJobs)
    .set({
      status: "completed",
      totalRecords: counts.total,
      importedRecords: counts.imported,
      failedRecords: counts.failed,
      completedAt: new Date(),
    })
    .where(eq(importJobs.id, jobId));
}

export async function failImportJob(jobId: string, errorMessage: string): Promise<void> {
  const db = getDb();
  await db
    .update(importJobs)
    .set({ status: "failed", errorLog: errorMessage, completedAt: new Date() })
    .where(eq(importJobs.id, jobId));
}

export async function rollbackImportJob(jobId: string): Promise<void> {
  await withTransaction(async (tx) => {
    // Delete posts first — cascades to votes and comments via their existing FKs
    await tx.delete(feedbackPosts).where(eq(feedbackPosts.importJobId, jobId));
    await tx
      .update(importJobs)
      .set({ status: "rolled_back", completedAt: new Date() })
      .where(eq(importJobs.id, jobId));
  });
}

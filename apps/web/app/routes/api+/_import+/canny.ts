import { requireAdmin, requireOrganization } from "@features/auth/server/guards";
import { runCannyImport } from "@features/internal/import/server/import-service";
import { rollbackImportJob } from "@features/internal/import/server/job-service";
import { z } from "zod";
import { data } from "react-router";
import type { Route } from "./+types/canny";

const ImportSchema = z.object({
  apiKey: z.string().min(1, "Canny API key is required"),
});

const RollbackSchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
});

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);
  await requireAdmin(organizationId, session.user.id);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return data({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Rollback an existing import job
  if (request.method === "DELETE") {
    const parsed = RollbackSchema.safeParse(body);
    if (!parsed.success) {
      return data({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }
    await rollbackImportJob(parsed.data.jobId);
    return data({ success: true });
  }

  // Run a new Canny import
  const parsed = ImportSchema.safeParse(body);
  if (!parsed.success) {
    return data({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const result = await runCannyImport(organizationId, parsed.data.apiKey, session.user.id);
  return data({ success: true, ...result });
}

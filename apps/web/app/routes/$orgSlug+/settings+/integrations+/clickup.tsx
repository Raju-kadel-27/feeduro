import { requireOrgBySlug } from "@features/auth/server/guards";
import { ClickupSettingsPage } from "@features/internal/integrations/clickup/components/clickup-settings-page";
import { getIntegration } from "@features/internal/integrations/server/queries";
import { and, eq } from "drizzle-orm";
import { member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/clickup";

export function meta() {
  return [{ title: "ClickUp Integration — Feeduro" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const [integration, memberRecord] = await Promise.all([
    getIntegration(db, organizationId, "clickup"),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
  ]);

  const settings = integration?.settings
    ? (JSON.parse(integration.settings) as {
        workspaceId?: string;
        workspaceName?: string;
        defaultSpaceId?: string;
        defaultListId?: string;
        defaultListName?: string;
        autoCreateTasks?: boolean;
        webhookId?: string;
        statusMappings?: Array<{ clickupStatus: string; feeduroStatus: string }>;
      })
    : null;

  return {
    integration: integration
      ? {
          connected: !!integration.accessToken,
          workspaceId: settings?.workspaceId ?? null,
          workspaceName: settings?.workspaceName ?? null,
          defaultSpaceId: settings?.defaultSpaceId ?? null,
          defaultListId: settings?.defaultListId ?? null,
          defaultListName: settings?.defaultListName ?? null,
          autoCreateTasks: settings?.autoCreateTasks ?? false,
          statusMappings: settings?.statusMappings ?? [],
          webhookConfigured: !!settings?.webhookId,
        }
      : null,
    isAdmin: memberRecord?.role === "admin",
  };
}

export function ErrorBoundary() {
  return (
    <div className="p-6 text-sm text-destructive">
      Failed to load ClickUp integration settings.
    </div>
  );
}

export default function ClickupIntegrationPage({ loaderData }: Route.ComponentProps) {
  return <ClickupSettingsPage integration={loaderData.integration} isAdmin={loaderData.isAdmin} />;
}

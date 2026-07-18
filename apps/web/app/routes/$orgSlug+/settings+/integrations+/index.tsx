import { RouteErrorMessage } from "@components/common/route-error";
import { SettingsSkeleton } from "@components/common/settings-skeleton";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import IntegrationsPage from "@features/internal/integrations/components/integrations-page";
import { LockedIntegrationsPage } from "@features/internal/integrations/components/locked-integrations-page";
import type { IntegrationsLoaderData } from "@features/internal/integrations/server/loader";
import { integrationsLoader } from "@features/internal/integrations/server/loader";
import { upsertNotificationSettings } from "@features/internal/integrations/server/queries";
import { Suspense } from "react";
import { Await, data } from "react-router";
import { z } from "zod";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/index";

type IntegrationsData = IntegrationsLoaderData | { planLocked: true };

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);
  const dataPromise: Promise<IntegrationsData> = Promise.all([
    getOrgPlanLimits(db, organizationId),
    integrationsLoader(db, organizationId, session.user.id),
  ]).then(([planLimits, loaderData]) => {
    if (planLimits.integrations === 0) return { planLocked: true as const };
    return loaderData;
  });
  return { dataPromise };
}

export function ErrorBoundary() {
  return <RouteErrorMessage resource="integrations" />;
}

const UpdateEventsSchema = z.object({
  intent: z.literal("update_notification_events"),
  events: z
    .string()
    .transform((s) => JSON.parse(s))
    .pipe(z.array(z.string())),
});

const ActionSchema = z.discriminatedUnion("intent", [UpdateEventsSchema]);

export async function action({ request, params, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrgBySlug(db, request, params.orgSlug);
  const form = Object.fromEntries(await request.formData());
  const parsed = ActionSchema.safeParse(form);
  if (!parsed.success) return data({ ok: false }, { status: 400 });

  await upsertNotificationSettings(db, organizationId, { enabledEvents: parsed.data.events });
  return data({ ok: true });
}

export default function IntegrationsRoute({ loaderData }: Route.ComponentProps) {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <Await
        resolve={loaderData.dataPromise as unknown as Promise<IntegrationsData>}
        errorElement={<RouteErrorMessage resource="integrations" />}
      >
        {(pageData) => {
          if ("planLocked" in pageData) return <LockedIntegrationsPage />;
          return <IntegrationsPage loaderData={pageData} />;
        }}
      </Await>
    </Suspense>
  );
}

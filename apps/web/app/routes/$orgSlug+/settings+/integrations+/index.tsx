import { requireOrgBySlug } from "@features/auth/server/guards";
import { integrationsLoader } from "@features/internal/integrations/server/loader";
import { upsertNotificationSettings } from "@features/internal/integrations/server/queries";
import { data } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/index";

export const loader = integrationsLoader;

const UpdateEventsSchema = z.object({
  intent: z.literal("update_notification_events"),
  events: z
    .string()
    .transform((s) => JSON.parse(s))
    .pipe(z.array(z.string())),
});

const ActionSchema = z.discriminatedUnion("intent", [UpdateEventsSchema]);

export async function action({ request, params }: Route.ActionArgs) {
  const { organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const form = Object.fromEntries(await request.formData());
  const parsed = ActionSchema.safeParse(form);
  if (!parsed.success) return data({ ok: false }, { status: 400 });

  await upsertNotificationSettings(organizationId, { enabledEvents: parsed.data.events });
  return data({ ok: true });
}

export { default } from "@features/internal/integrations/components/integrations-page";

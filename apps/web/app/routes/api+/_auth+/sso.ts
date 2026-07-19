import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import { logOrgActivity } from "@features/internal/audit/server/log-org-activity";
import { getOrgPlanLimits, planGateResponse } from "@features/internal/billing/server/plan-limits";
import { getAuth } from "@lib/auth/server";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";
import { member, ssoProvider } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/sso";

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

const RegisterSSOSchema = z.object({
  intent: z.literal("register"),
  issuer: z.string().url("Issuer must be a valid URL"),
  domain: z.string().regex(DOMAIN_RE, "Invalid domain format"),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client secret is required"),
  providerId: z.string().min(1, "Provider ID is required"),
});

const DeleteSSOSchema = z.object({
  intent: z.literal("delete"),
  id: z.string().min(1, "ID is required"),
});

const SSOActionSchema = z.discriminatedUnion("intent", [RegisterSSOSchema, DeleteSSOSchema]);

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);

  const providers = await db.query.ssoProvider.findMany({
    where: eq(ssoProvider.organizationId, organizationId),
    columns: {
      id: true,
      issuer: true,
      domain: true,
      providerId: true,
      oidcConfig: true,
    },
  });

  return data({
    providers: providers.map((p) => {
      let clientId: string | null = null;
      if (p.oidcConfig) {
        try {
          const cfg = JSON.parse(p.oidcConfig) as { clientId?: string };
          clientId = cfg.clientId ?? null;
        } catch (err) {
          console.error("[sso] failed to parse oidcConfig for provider", p.id, err);
        }
      }
      const type = p.oidcConfig ? "oidc" : "saml";
      return {
        id: p.id,
        issuer: p.issuer,
        domain: p.domain,
        providerId: p.providerId,
        type,
        clientId,
      };
    }),
  });
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrganization(db, request);

  await requirePermission(db, organizationId, session.user.id, { security: ["update"] });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return data({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SSOActionSchema.safeParse(rawBody);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid request";
    return data({ error: message }, { status: 400 });
  }

  const body = parsed.data;

  if (body.intent === "register") {
    const planLimits = await getOrgPlanLimits(db, organizationId);
    const gate = planGateResponse(planLimits, "sso");
    if (gate) return gate;

    try {
      await getAuth(db).api.registerSSOProvider({
        body: {
          providerId: body.providerId,
          issuer: body.issuer,
          domain: body.domain,
          organizationId,
          oidcConfig: { clientId: body.clientId, clientSecret: body.clientSecret },
        },
        headers: request.headers,
      });
      await logOrgActivity(db, {
        orgId: organizationId,
        actor: { id: session.user.id, email: session.user.email, name: session.user.name },
        action: "sso_configured",
        target: { type: "sso_provider", id: body.providerId },
        metadata: { domain: body.domain, issuer: body.issuer },
        request,
      });
      return data({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to register SSO provider";
      return data({ error: msg }, { status: 400 });
    }
  }

  const deleted = await db
    .delete(ssoProvider)
    .where(and(eq(ssoProvider.id, body.id), eq(ssoProvider.organizationId, organizationId)))
    .returning({ id: ssoProvider.id });

  if (!deleted.length) return data({ error: "Provider not found" }, { status: 404 });

  await logOrgActivity(db, {
    orgId: organizationId,
    actor: { id: session.user.id, email: session.user.email, name: session.user.name },
    action: "sso_deleted",
    target: { type: "sso_provider", id: body.id },
    request,
  });
  return data({ success: true });
}

import { requireOrganization } from "@features/auth/server/guards";
import { isAdmin } from "@features/roles/server/queries";
import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { auth } from "@/app/lib/auth/server";
import { getDb } from "@/db";
import { member, ssoProvider } from "@/db/schema";

import type { Route } from "./+types/sso";

export async function loader({ request }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);
  const db = getDb();

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
        } catch {}
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

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);

  if (!(await isAdmin(organizationId, session.user.id))) {
    return data({ error: "Only admins can manage SSO" }, { status: 403 });
  }

  const body = (await request.json()) as { intent: string; [key: string]: unknown };

  if (body.intent === "register") {
    const issuer = (body.issuer as string)?.trim();
    const domain = (body.domain as string)?.trim();
    const clientId = (body.clientId as string)?.trim();
    const clientSecret = (body.clientSecret as string)?.trim();
    const providerId = (body.providerId as string)?.trim();

    if (!issuer || !domain || !clientId || !clientSecret || !providerId) {
      return data({ error: "All fields are required" }, { status: 400 });
    }

    try {
      await auth.api.registerSSOProvider({
        body: {
          providerId,
          issuer,
          domain,
          organizationId,
          oidcConfig: { clientId, clientSecret },
        },
        headers: request.headers,
      });
      return data({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to register SSO provider";
      return data({ error: msg }, { status: 400 });
    }
  }

  if (body.intent === "delete") {
    const id = body.id as string;
    if (!id) return data({ error: "ID is required" }, { status: 400 });

    const db = getDb();
    await db
      .delete(ssoProvider)
      .where(and(eq(ssoProvider.id, id), eq(ssoProvider.organizationId, organizationId)));

    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}

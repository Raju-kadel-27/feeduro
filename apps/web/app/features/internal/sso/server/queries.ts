import { requireOrgBySlug } from "@features/auth/server/guards";
import { getBaseUrl } from "@utils/base-url";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { member, ssoProvider } from "@/db/schema";

export const SSOProviderSchema = z.object({
  id: z.string(),
  issuer: z.string(),
  domain: z.string().nullable(),
  providerId: z.string().nullable(),
  type: z.enum(["oidc", "saml"]),
  clientId: z.string().nullable(),
});

export type SSOProvider = z.infer<typeof SSOProviderSchema>;

export async function loadSSOSettings(db: Db, request: Request, orgSlug: string) {
  const { session, organizationId } = await requireOrgBySlug(db, request, orgSlug);

  const [providers, memberRecord] = await Promise.all([
    db.query.ssoProvider.findMany({
      where: eq(ssoProvider.organizationId, organizationId),
      columns: { id: true, issuer: true, domain: true, providerId: true, oidcConfig: true },
    }),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
  ]);

  return {
    isAdmin: memberRecord?.role === "admin",
    baseUrl: getBaseUrl(),
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
      return SSOProviderSchema.parse({
        id: p.id,
        issuer: p.issuer,
        domain: p.domain,
        providerId: p.providerId,
        type: p.oidcConfig ? "oidc" : "saml",
        clientId,
      });
    }),
  };
}

import { sendInvitationEmail } from "@jobs/send-invitation-email";
import { getBaseUrl } from "@utils/base-url";
import { organization } from "better-auth/plugins";
import { ac, adminRole, memberRole, viewerRole } from "@/app/lib/auth/server/permissions";
import type { Db } from "@/db";
import { orgHooks } from "./org-hooks";

export function buildOrgPlugin(db: Db) {
  return organization({
    ac,
    roles: {
      admin: adminRole,
      member: memberRole,
      viewer: viewerRole,
    },
    dynamicAccessControl: { enabled: true },
    creatorRole: "admin",
    allowUserToCreateOrganization: async (_user) => true,
    sendInvitationEmail: async (data) => {
      const acceptUrl = `${getBaseUrl()}/accept-invitation?invitationId=${data.id}`;
      const { inviter, organization, role } = data;
      const emailStatus = await sendInvitationEmail({
        inviterName: inviter.user.name,
        inviterEmail: inviter.user.email,
        workspaceName: organization.name,
        role: role ?? "member",
        acceptUrl,
        recipientEmail: data.email,
      });
      console.log({ emailStatus });
    },
    organizationHooks: orgHooks(db),
  });
}

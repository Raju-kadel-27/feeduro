import type { Db } from "@/db";
import { feedbackBoards } from "@/db/schema";

export function orgHooks(db: Db) {
  return {
    afterCreateOrganization: async ({
      organization,
      member,
    }: {
      organization: { id: string; name: string };
      member: { id: string; userId: string };
    }) => {
      console.info(
        `[Org] Created: ${organization.name} (${organization.id}), owner member: ${member.id}`,
      );
      await db.insert(feedbackBoards).values([
        {
          organizationId: organization.id,
          name: "Feature Requests",
          slug: "feature-requests",
          visibility: "public",
          isDefault: true,
          createdBy: member.userId,
        },
        {
          organizationId: organization.id,
          name: "Bug Reports",
          slug: "bug-reports",
          visibility: "public",
          isDefault: false,
          createdBy: member.userId,
        },
      ]);
    },
  };
}

import { requireOrganization } from "@features/auth/server/guards";
import { eq } from "drizzle-orm";
import { data } from "react-router";
import { member, user as userTable } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/org-members";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);

  const members = await db
    .select({
      id: member.userId,
      name: userTable.name,
      image: userTable.image,
    })
    .from(member)
    .innerJoin(userTable, eq(member.userId, userTable.id))
    .where(eq(member.organizationId, organizationId));

  return data({ orgMembers: members });
}

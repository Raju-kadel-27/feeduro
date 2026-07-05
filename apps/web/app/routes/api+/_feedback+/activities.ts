import { requireOrganization } from "@features/auth/server/guards";
import { asc, eq } from "drizzle-orm";
import { data } from "react-router";
import { postActivities, user } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/activities";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = getDb(context);
  await requireOrganization(db, request);

  const url = new URL(request.url);
  const postId = url.searchParams.get("postId");

  if (!postId) return data({ activities: [] });

  try {
    const rows = await db
      .select({
        id: postActivities.id,
        type: postActivities.type,
        oldValue: postActivities.oldValue,
        newValue: postActivities.newValue,
        userId: postActivities.userId,
        createdAt: postActivities.createdAt,
        userName: user.name,
        userImage: user.image,
      })
      .from(postActivities)
      .leftJoin(user, eq(postActivities.userId, user.id))
      .where(eq(postActivities.postId, postId))
      .orderBy(asc(postActivities.createdAt));

    return data({
      activities: rows.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    });
  } catch {
    return data({ activities: [] });
  }
}

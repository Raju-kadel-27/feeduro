import { requireOrganization, requirePermission } from "@features/auth/server/guards";
import {
  addTagToPost,
  createTag,
  deleteTag,
  getOrgTags,
  getPostTags,
  removeTagFromPost,
} from "@features/feedback/server/tags";
import { data } from "react-router";

import type { Route } from "./+types/tags";

export async function loader({ request }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrganization(request);
  const url = new URL(request.url);
  const postId = url.searchParams.get("postId");

  if (postId) {
    const [postTagList, allTags] = await Promise.all([
      getPostTags(postId),
      getOrgTags(organizationId),
    ]);
    return data({ postTags: postTagList, availableTags: allTags });
  }

  const tags = await getOrgTags(organizationId);
  return data({ tags });
}

export async function action({ request }: Route.ActionArgs) {
  const { session, organizationId } = await requireOrganization(request);
  const body = (await request.json()) as { intent: string; [key: string]: unknown };

  if (body.intent === "create") {
    await requirePermission(organizationId, session.user.id, { feedback: ["update"] });
    const name = (body.name as string)?.trim();
    const color = (body.color as string) ?? "#6366f1";
    if (!name) return data({ error: "Name is required" }, { status: 400 });
    try {
      const tag = await createTag(organizationId, name, color);
      return data({ tag });
    } catch {
      return data({ error: "Tag name already exists" }, { status: 409 });
    }
  }

  if (body.intent === "delete") {
    await requirePermission(organizationId, session.user.id, { feedback: ["update"] });
    const tagId = body.tagId as string;
    if (!tagId) return data({ error: "tagId required" }, { status: 400 });
    await deleteTag(organizationId, tagId);
    return data({ success: true });
  }

  if (body.intent === "add_to_post") {
    await requirePermission(organizationId, session.user.id, { feedback: ["update"] });
    const { postId, tagId } = body as { postId: string; tagId: string };
    if (!postId || !tagId) return data({ error: "postId and tagId required" }, { status: 400 });
    await addTagToPost(postId, tagId, session.user.id, organizationId);
    return data({ success: true });
  }

  if (body.intent === "remove_from_post") {
    await requirePermission(organizationId, session.user.id, { feedback: ["update"] });
    const { postId, tagId } = body as { postId: string; tagId: string };
    if (!postId || !tagId) return data({ error: "postId and tagId required" }, { status: 400 });
    await removeTagFromPost(postId, tagId);
    return data({ success: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}

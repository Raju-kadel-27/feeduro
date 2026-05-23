import { parseBranding } from "@features/branding/server/parse-branding";
import { generateOgPng } from "@features/feedback/server/og-image";
import { eq } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";
import { getDb } from "@/db";
import { feedbackPosts, organization } from "@/db/schema";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const orgSlug = url.searchParams.get("orgSlug");
  const postId = url.searchParams.get("postId");

  if (!orgSlug) {
    return new Response("Missing orgSlug", { status: 400 });
  }

  const db = getDb();

  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, orgSlug),
    columns: { id: true, name: true, metadata: true },
  });

  if (!org) {
    return new Response("Not found", { status: 404 });
  }

  const branding = parseBranding(org.metadata ?? null);

  let postTitle: string | undefined;
  let voteCount: number | undefined;

  if (postId) {
    const post = await db.query.feedbackPosts.findFirst({
      where: eq(feedbackPosts.id, postId),
      columns: { title: true, voteCount: true, organizationId: true },
    });
    if (post?.organizationId === org.id) {
      postTitle = post.title;
      voteCount = post.voteCount ?? 0;
    }
  }

  const png = await generateOgPng({
    orgName: org.name ?? orgSlug,
    primaryColor: branding.primaryColor,
    hidePoweredBy: branding.hidePoweredBy,
    postTitle,
    voteCount,
  });

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

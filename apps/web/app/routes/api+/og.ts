import { parseBranding } from "@features/branding/server/parse-branding";
import { getBindings } from "@middleware/cloudflare.server";
import { eq } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";
import { getDb } from "@/db";
import { feedbackPosts, organization } from "@/db/schema";

export async function loader({ request, context }: LoaderFunctionArgs) {
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

  const env = getBindings(context);
  const ogWorker = (env as unknown as { OG_WORKER?: Fetcher }).OG_WORKER;

  if (!ogWorker) {
    return new Response("OG image service unavailable", { status: 503 });
  }

  const ogUrl = new URL("https://feeduro-og.workers.dev/");
  ogUrl.searchParams.set("orgName", org.name ?? orgSlug);
  ogUrl.searchParams.set("primaryColor", branding.primaryColor);
  ogUrl.searchParams.set("hidePoweredBy", String(branding.hidePoweredBy));
  if (postTitle) ogUrl.searchParams.set("postTitle", postTitle);
  if (voteCount !== undefined) ogUrl.searchParams.set("voteCount", String(voteCount));

  return ogWorker.fetch(new Request(ogUrl.toString()));
}

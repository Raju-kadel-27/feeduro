import { parseBranding } from "@features/branding/server/parse-branding";
import { getBindings, getDb } from "@middleware/cloudflare.server";
import { eq } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";
import { feedbackPosts, organization } from "@/db/schema";

export async function loader({ request, context }: LoaderFunctionArgs) {
  // Cache the rendered PNG at the Cloudflare edge — OG images are stable for 1hr
  // and social platforms (Slack, Twitter) unfurl the same URL many times in bursts.
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const db = getDb(context);
  const url = new URL(request.url);
  const orgSlug = url.searchParams.get("orgSlug");
  const postId = url.searchParams.get("postId");

  if (!orgSlug) {
    return new Response("Missing orgSlug", { status: 400 });
  }

  // Fetch org and post concurrently — post query needs org.id for tenant check,
  // but we can fire both and validate in JS after both resolve.
  const [org, post] = await Promise.all([
    db.query.organization.findFirst({
      where: eq(organization.slug, orgSlug),
      columns: { id: true, name: true, metadata: true },
    }),
    postId
      ? db.query.feedbackPosts.findFirst({
          where: eq(feedbackPosts.id, postId),
          columns: { title: true, voteCount: true, organizationId: true },
        })
      : Promise.resolve(null),
  ]);

  if (!org) {
    return new Response("Not found", { status: 404 });
  }

  const branding = parseBranding(org.metadata ?? null);

  let postTitle: string | undefined;
  let voteCount: number | undefined;

  if (post?.organizationId === org.id) {
    postTitle = post.title;
    voteCount = post.voteCount ?? 0;
  }

  const env = getBindings(context);
  const ogWorker = (env as unknown as { OG_WORKER?: Fetcher }).OG_WORKER;

  if (!ogWorker) {
    return new Response("OG image service unavailable", { status: 503 });
  }

  // URL hostname is arbitrary for service bindings — Cloudflare routes by binding
  // name, not hostname. Using a recognisable placeholder avoids confusion.
  const ogUrl = new URL("https://og-worker.internal/");
  ogUrl.searchParams.set("orgName", org.name ?? orgSlug);
  ogUrl.searchParams.set("primaryColor", branding.primaryColor);
  ogUrl.searchParams.set("hidePoweredBy", String(branding.hidePoweredBy));
  if (postTitle) ogUrl.searchParams.set("postTitle", postTitle);
  if (voteCount !== undefined) ogUrl.searchParams.set("voteCount", String(voteCount));

  const response = await ogWorker.fetch(new Request(ogUrl.toString()));

  // Only cache successful renders; don't cache 500s from the og-worker.
  if (response.ok) {
    await cache.put(request, response.clone());
  }

  return response;
}

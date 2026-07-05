import { PublicBoardPage } from "@features/feedback/components/public/public-board-page";
import { publicPageLoader } from "@features/feedback/server/public-loader";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/$orgSlug";

export function loader({ request, params, context }: Route.LoaderArgs) {
  return publicPageLoader(getDb(context), { request, params });
}

export function meta({ data: loaderData, location }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Feedback Board" }];

  const { org, posts, customDomain } = loaderData;
  const searchParams = new URLSearchParams(location.search);
  const postId = searchParams.get("postId");
  const post = postId ? posts.find((p) => p.id === postId) ?? null : null;

  const boardBase = customDomain
    ? `https://${customDomain}`
    : `https://${org.slug}.feeduro.com`;
  const canonical = postId ? `${boardBase}/?postId=${postId}` : `${boardBase}/`;
  const ogImageUrl = postId
    ? `${boardBase}/api/og?orgSlug=${org.slug}&postId=${postId}`
    : `${boardBase}/api/og?orgSlug=${org.slug}`;

  const title = post ? `${post.title} — ${org.name}` : `${org.name} – Feedback`;
  const description = post
    ? `${post.voteCount} votes · Share your ideas for ${org.name}.`
    : `Share your feedback and ideas for ${org.name}.`;

  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: canonical },
    { property: "og:type", content: "website" },
    { property: "og:url", content: canonical },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImageUrl },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImageUrl },
  ];
}

export default function PublicBoardRoute({ loaderData }: Route.ComponentProps) {
  return <PublicBoardPage loaderData={loaderData} />;
}

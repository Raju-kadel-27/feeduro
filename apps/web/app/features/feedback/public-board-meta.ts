import { getPublicBoardUrl } from "@features/domains/public-board-url";
import type { MetaDescriptor } from "react-router";

type PublicBoardMetaData = {
  org: { name: string; slug: string };
  posts: { id: string; title: string; voteCount: number }[];
  customDomain: string | null;
};

/**
 * Meta tags for the public board. Shared by the path-based `/:orgSlug` route
 * and the org-subdomain branch of the index route so both render identical
 * canonical/OG tags.
 */
export function buildPublicBoardMeta(
  loaderData: PublicBoardMetaData | undefined,
  search: string,
): MetaDescriptor[] {
  if (!loaderData) return [{ title: "Feedback Board" }];

  const { org, posts, customDomain } = loaderData;
  const searchParams = new URLSearchParams(search);
  const postId = searchParams.get("postId");
  const post = postId ? posts.find((p) => p.id === postId) ?? null : null;

  const boardBase = customDomain ? `https://${customDomain}` : getPublicBoardUrl(org.slug);
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

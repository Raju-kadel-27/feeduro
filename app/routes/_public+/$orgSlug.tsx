import { PublicBoardPage } from "@features/feedback/components/public-board-page";
import { publicPageLoader } from "@features/feedback/server/public-loader";

import type { Route } from "./+types/$orgSlug";

export const loader = publicPageLoader;

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Feedback Board" }];

  const canonical = (loaderData as { customDomain?: string }).customDomain
    ? `https://${(loaderData as { customDomain: string }).customDomain}/`
    : `https://${loaderData.org.slug}.feediyo.com/`;

  return [
    { title: `${loaderData.org.name} – Feedback` },
    { name: "description", content: `Share your feedback and ideas for ${loaderData.org.name}.` },
    { tagName: "link", rel: "canonical", href: canonical },
  ];
}

export default function PublicBoardRoute({ loaderData }: Route.ComponentProps) {
  return <PublicBoardPage loaderData={loaderData} />;
}

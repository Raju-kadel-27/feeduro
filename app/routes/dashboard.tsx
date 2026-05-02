import { getActiveOrgSlug, requireSession } from "@lib/session.server";
import { redirect } from "react-router";

export async function loader({ request }: { request: Request }) {
  await requireSession(request);
  const slug = await getActiveOrgSlug(request);
  if (!slug) throw redirect("/onboarding");
  throw redirect(`/${slug}/dashboard`);
}

export default function DashboardRedirect() {
  return null;
}

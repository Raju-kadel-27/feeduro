import { resolveOrgRedirect } from "@features/workspace/server/queries";
import { requireSession } from "@lib/session";
import { redirect } from "react-router";

export async function loader({ request }: { request: Request }) {
  const session = await requireSession(request);
  const slug = await resolveOrgRedirect(request, session);
  throw redirect(slug ? `/${slug}/dashboard` : "/onboarding");
}

export default function IndexRedirect() {
  return null;
}

import { auth } from "@lib/auth/server";
import { redirect } from "react-router";

export async function requireSession(request: Request) {
  let session: Awaited<ReturnType<typeof auth.api.getSession>>;
  try {
    session = await auth.api.getSession({ headers: request.headers });
  } catch {
    throw redirect("/sign-in");
  }
  if (!session) throw redirect("/sign-in");
  return session;
}

export async function getSession(request: Request) {
  try {
    return await auth.api.getSession({ headers: request.headers });
  } catch {
    return null;
  }
}

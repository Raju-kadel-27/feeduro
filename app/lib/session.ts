import { auth } from "@lib/auth/server";
import { redirect } from "react-router";

export async function requireSession(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw redirect("/sign-in");
  return session;
}

export async function getSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

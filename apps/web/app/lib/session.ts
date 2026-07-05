import { getAuth } from "@lib/auth/server";
import { redirect } from "react-router";
import type { Db } from "@/db";

export async function requireSession(db: Db, request: Request) {
  let session: Awaited<ReturnType<ReturnType<typeof getAuth>["api"]["getSession"]>>;
  try {
    session = await getAuth(db).api.getSession({ headers: request.headers });
  } catch {
    throw redirect("/sign-in");
  }
  if (!session) throw redirect("/sign-in");
  return session;
}

export async function getSession(db: Db, request: Request) {
  try {
    return await getAuth(db).api.getSession({ headers: request.headers });
  } catch {
    return null;
  }
}

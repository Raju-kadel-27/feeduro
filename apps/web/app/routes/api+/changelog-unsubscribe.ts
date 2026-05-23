import { unsubscribeByToken } from "@features/changelog/server/subscribers";
import type { Route } from "./+types/changelog-unsubscribe";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  const success = await unsubscribeByToken(token);

  if (!success) {
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>Already unsubscribed</h2>
        <p>This link has already been used or is invalid.</p>
      </body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } },
    );
  }

  return new Response(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px">
      <h2>You're unsubscribed</h2>
      <p>You will no longer receive changelog notifications.</p>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}

import { getBindings } from "@middleware/cloudflare.server";
import type { Route } from "./+types/media.$";

export async function loader({ params, context }: Route.LoaderArgs) {
  const key = params["*"];
  if (!key) return new Response("Not found", { status: 404 });

  const env = getBindings(context);
  if (!env.AVATARS_BUCKET) return new Response("Storage not configured", { status: 503 });

  const object = await env.AVATARS_BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
}

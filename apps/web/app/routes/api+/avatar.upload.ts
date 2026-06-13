import { requireSession } from "@lib/session";
import { getBindings } from "@middleware/cloudflare.server";
import type { Route } from "./+types/avatar.upload";

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function action({ request, context }: Route.ActionArgs) {
  try {
    const session = await requireSession(request);
    const env = getBindings(context);

    if (!env.AVATARS_BUCKET) {
      return Response.json({ error: "Image storage not configured — restart dev server after adding R2 binding" }, { status: 503 });
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) return Response.json({ error: "Invalid form data" }, { status: 400 });

    const file = formData.get("file");
    if (!(file instanceof File)) return Response.json({ error: "No file provided" }, { status: 400 });

    const ext = ALLOWED[file.type];
    if (!ext) {
      return Response.json(
        { error: "Unsupported type. Use JPEG, PNG, or WebP." },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return Response.json({ error: "File too large. Max 2 MB." }, { status: 400 });
    }

    const key = `${session.user.id}/${crypto.randomUUID()}.${ext}`;

    await env.AVATARS_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    const origin = new URL(request.url).origin;
    return Response.json({ url: `${origin}/api/avatar/${key}` });
  } catch (err) {
    console.error("[avatar upload]", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

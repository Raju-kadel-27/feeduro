import { requireSession } from "@lib/session";
import { getBindings } from "@middleware/cloudflare.server";
import type { Route } from "./+types/media.upload";

const ALLOWED_IMAGE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const ALLOWED_VIDEO: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};
const ALLOWED = { ...ALLOWED_IMAGE, ...ALLOWED_VIDEO };

const MAX_IMAGE = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO = 50 * 1024 * 1024; // 50 MB

export async function action({ request, context }: Route.ActionArgs) {
  try {
    const session = await requireSession(request);
    const env = getBindings(context);

    if (!env.AVATARS_BUCKET) {
      return Response.json({ error: "Storage not configured" }, { status: 503 });
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) return Response.json({ error: "Invalid form data" }, { status: 400 });

    const file = formData.get("file");
    if (!(file instanceof File)) return Response.json({ error: "No file provided" }, { status: 400 });

    const ext = ALLOWED[file.type];
    if (!ext) {
      return Response.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const isVideo = file.type in ALLOWED_VIDEO;
    const maxBytes = isVideo ? MAX_VIDEO : MAX_IMAGE;
    if (file.size > maxBytes) {
      return Response.json(
        { error: `File too large. Max ${isVideo ? "50" : "5"} MB.` },
        { status: 400 },
      );
    }

    const key = `changelog/${session.user.id}/${crypto.randomUUID()}.${ext}`;
    await env.AVATARS_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    const origin = new URL(request.url).origin;
    return Response.json({ url: `${origin}/api/media/${key}` });
  } catch (err) {
    console.error("[media upload]", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

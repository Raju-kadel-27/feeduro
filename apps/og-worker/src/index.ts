import { generateOgPng } from "./og-image";

export default {
  async fetch(request: Request): Promise<Response> {
    // Only cache GET requests; service binding calls are always GET.
    const cache = caches.default;
    const cached = await cache.match(request);
    if (cached) return cached;

    const url = new URL(request.url);
    const orgName = url.searchParams.get("orgName") ?? "";
    const primaryColor = url.searchParams.get("primaryColor") ?? "indigo";
    const hidePoweredBy = url.searchParams.get("hidePoweredBy") === "true";
    const postTitleParam = url.searchParams.get("postTitle");
    const voteCountParam = url.searchParams.get("voteCount");

    const postTitle = postTitleParam ?? undefined;
    const voteCount = voteCountParam !== null ? Number(voteCountParam) : undefined;

    try {
      const png = await generateOgPng({ orgName, primaryColor, hidePoweredBy, postTitle, voteCount });
      const response = new Response(png, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
      // Store in the Cloudflare edge cache so subsequent identical requests
      // skip rendering entirely (satori+resvg are CPU-heavy).
      await cache.put(request, response.clone());
      return response;
    } catch (err) {
      console.error("[og-worker] generateOgPng failed:", err);
      return new Response("Failed to generate image", { status: 500 });
    }
  },
};

import type { APIRoute } from "astro";
import sharp from "sharp";

export const prerender = true;

const SVG = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1200" height="630" fill="#0c0a1e"/>

  <!-- Left accent bar -->
  <rect x="0" y="0" width="8" height="630" fill="#6366f1"/>

  <!-- Top-left decorative circle (blurred brand blob) -->
  <circle cx="1080" cy="80" r="240" fill="#4f46e5" opacity="0.12"/>
  <circle cx="120" cy="560" r="180" fill="#818cf8" opacity="0.08"/>

  <!-- Feediyo wordmark -->
  <text
    x="80" y="210"
    font-family="ui-sans-serif, system-ui, -apple-system, sans-serif"
    font-size="40"
    font-weight="700"
    letter-spacing="-0.5"
    fill="#818cf8"
  >Feediyo</text>

  <!-- Main headline -->
  <text
    x="80" y="305"
    font-family="ui-sans-serif, system-ui, -apple-system, sans-serif"
    font-size="76"
    font-weight="800"
    letter-spacing="-2"
    fill="#ffffff"
  >API Documentation</text>

  <!-- Subheading -->
  <text
    x="80" y="368"
    font-family="ui-sans-serif, system-ui, -apple-system, sans-serif"
    font-size="28"
    fill="#94a3b8"
  >Feedback · Changelog · Roadmap · Webhooks</text>

  <!-- Divider -->
  <line x1="80" y1="420" x2="480" y2="420" stroke="#4f46e5" stroke-width="2"/>

  <!-- URL -->
  <text
    x="80" y="460"
    font-family="ui-monospace, Menlo, monospace"
    font-size="22"
    fill="#6366f1"
  >docs.feediyo.com</text>

  <!-- Bottom pill badges -->
  <rect x="80" y="510" width="130" height="36" rx="18" fill="#1e1b4b"/>
  <text x="145" y="533" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" fill="#a5b4fc">REST API</text>

  <rect x="224" y="510" width="130" height="36" rx="18" fill="#1e1b4b"/>
  <text x="289" y="533" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" fill="#a5b4fc">OpenAPI 3.1</text>

  <rect x="368" y="510" width="130" height="36" rx="18" fill="#1e1b4b"/>
  <text x="433" y="533" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" fill="#a5b4fc">v1</text>
</svg>
`;

export const GET: APIRoute = async () => {
  const png = await sharp(Buffer.from(SVG)).png().toBuffer();
  return new Response(png, {
    headers: { "Content-Type": "image/png" },
  });
};

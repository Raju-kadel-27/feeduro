// Lightweight bot detection for the /r/:code click-tracking route.
// Mirrors Dub's multi-layer approach: method check, UA regex, referer blacklist.
// Bots inflate click counts and corrupt attribution data — drop them silently.

// HEAD requests are never real users navigating a page.
const BOT_METHODS = new Set(["HEAD", "OPTIONS"]);

// Common crawler / headless-browser user-agent substrings (case-insensitive).
// Based on Dub's bots-list.ts — trimmed to the highest-signal patterns.
const BOT_UA_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /scraper/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /axios\//i,
  /java\//i,
  /go-http/i,
  /node-fetch/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /playwright/i,
  /facebookexternalhit/i,
  /whatsapp/i,
  /slackbot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /discordbot/i,
  /telegrambot/i,
  /applebot/i,
  /bingpreview/i,
  /googleimageproxy/i,
  /preview\.search\.google/i,
  /anthropic-ai/i,
  /gptbot/i,
  /chatgpt/i,
  /perplexitybot/i,
  /claudebot/i,
  /ccbot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /yandex/i,
  /baidu/i,
  /sogou/i,
  /duckduckbot/i,
];

// Email security gateways scan links in emails — their clicks are never humans.
const BOT_REFERER_PATTERNS = [
  /urlsand\.com/i,
  /mimecastprotect\.com/i,
  /deref-mail\.com/i,
  /safelinks\.protection\.outlook\.com/i,
  /proofpointessentials\.com/i,
];

// Query params that signal automated/tracking traffic — skip attribution.
const BOT_QUERY_PARAMS = ["bot", "dub-no-track"];

export function isBot(request: Request): boolean {
  if (BOT_METHODS.has(request.method)) return true;

  const url = new URL(request.url);
  for (const param of BOT_QUERY_PARAMS) {
    if (url.searchParams.has(param)) return true;
  }

  const ua = request.headers.get("user-agent") ?? "";
  if (!ua) return true; // No UA = almost certainly automated
  for (const pattern of BOT_UA_PATTERNS) {
    if (pattern.test(ua)) return true;
  }

  const referer = request.headers.get("referer") ?? "";
  for (const pattern of BOT_REFERER_PATTERNS) {
    if (pattern.test(referer)) return true;
  }

  return false;
}

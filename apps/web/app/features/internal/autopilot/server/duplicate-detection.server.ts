import { generateText } from "@services/groq/client";
import { DuplicateDetectionResultSchema } from "../schemas";
import type { DuplicateDetectionResult } from "../types";

interface Post {
  id: string;
  title: string;
  description: string | null;
}

function buildPrompt(newPost: Post, existingPosts: Post[]): string {
  const existing = existingPosts
    .map(
      (p) =>
        `ID: ${p.id}\nTitle: ${p.title}${p.description ? `\nDescription: ${p.description}` : ""}`,
    )
    .join("\n\n");

  return `You are a precise duplicate detection system for a product feedback board.

Your single responsibility: determine whether the NEW POST is asking for the exact same thing as one of the EXISTING POSTS. Not similar. Not related. The same.

---

NEW POST:
Title: ${newPost.title}${newPost.description ? `\nDescription: ${newPost.description}` : ""}

EXISTING POSTS:
${existing}

---

STEP 0 — PRODUCT ISOLATION (do this first, every time):
1. Identify the primary subject of the NEW POST in one word or short phrase (e.g. "Linear", "dark mode", "CSV export").
2. For each existing post, identify its primary subject the same way.
3. If the new post names a specific product or tool, ANY existing post that names a DIFFERENT product is immediately NOT a duplicate — eliminate it and do not analyze it further.
   Example: NEW POST subject = "Linear" → existing post subject = "Klaviyo" → NOT a duplicate. Stop. Do not compare further.
Only continue to STEP 1 for remaining posts (if any).

STEP 1 — IDENTIFY THE CORE SUBJECT OF THE NEW POST.
Ask yourself: What specific thing is being requested? Name the exact product, feature, workflow, or fix.

STEP 2 — COMPARE AGAINST EACH REMAINING POST.
For each surviving post, ask: Is the core subject identical — not just related, not just in the same category?

DUPLICATE CHECKLIST (ALL must be true to mark as duplicate):
✓ Same specific subject (same tool, same feature name, same exact workflow)
✓ Same intent — both ultimately want the same thing, even if one is phrased more broadly or more specifically than the other

SAME-PRODUCT RULE (highest priority):
If both posts name the same specific third-party product AND both request it be added, integrated, or supported — they are duplicates, regardless of how the integration is described.
Examples that ARE duplicates:
- "Add Klaviyo integration" + "Add Klaviyo sync for contacts" → both want Klaviyo integrated
- "Slack integration" + "Slack notifications for new posts" → both want Slack connected
- "GitHub integration" + "Sync issues to GitHub" → both want GitHub integrated

NOT A DUPLICATE (any one of these disqualifies it):
✗ Different named products (e.g. "Linear integration" vs "Klaviyo sync" — Linear and Klaviyo are completely different products)
✗ Same feature area but fundamentally different scope (e.g. "email notifications for comments" vs "weekly email digest")
✗ One is a bug report, the other is a feature request
✗ Different target audience or workflow (e.g. admin-facing vs. end-user-facing)
✗ You are not confident — bias toward NOT duplicate

CRITICAL RULES:
- Shared generic keywords (integration, notification, export, dashboard) alone do NOT make posts duplicates — the specific subject must match.
- A named third-party product is a unique identity — never conflate two different products even if both request "integration".
- Specificity difference is NOT a disqualifier: a broad request and a specific version of that same request are still duplicates.
- Default to isDuplicate: false. A missed duplicate is recoverable. A false merge destroys user trust.

Respond ONLY with valid JSON (no markdown, no explanation outside the object):
{
  "isDuplicate": boolean,
  "matchedPostId": "id of the matched post if duplicate, otherwise null",
  "confidence": "low" | "medium" | "high",
  "reason": "one sentence — name the specific subjects of both posts and state exactly why they are the same or different"
}`;
}

export async function detectDuplicate(
  newPost: Post,
  existingPosts: Post[],
  apiKey: string,
): Promise<DuplicateDetectionResult | null> {
  if (existingPosts.length === 0) return null;

  const prompt = buildPrompt(newPost, existingPosts);
  let raw: string;

  try {
    raw = await generateText(prompt, apiKey, 0);
  } catch {
    return null;
  }

  // Strip markdown code fences if model wraps response
  const cleaned = raw
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch {
    console.error("[autopilot] duplicate-detection: model returned non-JSON response", cleaned);
    return null;
  }

  const parsed = DuplicateDetectionResultSchema.safeParse(parsedJson);
  if (!parsed.success || !parsed.data.isDuplicate || !parsed.data.matchedPostId) return null;

  // Reject low-confidence matches — too noisy and likely false positives
  if (parsed.data.confidence === "low") return null;

  // Verify the matched ID actually exists in our list to prevent hallucinations
  const validIds = new Set(existingPosts.map((p) => p.id));
  if (!validIds.has(parsed.data.matchedPostId)) return null;

  return parsed.data;
}

import { z } from "zod";

export const ErrorSchema = z
  .object({
    error: z.string().openapi({ example: "Invalid or expired API key", description: "Human-readable error message." }),
    code: z.string().openapi({ example: "invalid_api_key", description: "Machine-readable error code. Use this for programmatic error handling." }),
    details: z.unknown().optional().openapi({ description: "Present on `validation_error` responses. Contains `fieldErrors` (per-field messages) and `formErrors` (form-level messages)." }),
  })
  .openapi("Error");

export const SuccessSchema = z
  .object({ success: z.literal(true) })
  .openapi("Success");

export const PaginationMeta = {
  hasMore: z.boolean().openapi({
    description: "Whether more results exist beyond the current page. When `true`, pass `cursor` to the next request to page forward.",
    example: false,
  }),
  cursor: z.string().optional().openapi({
    description: "Opaque keyset cursor. Pass as the `cursor` query parameter in the next request to retrieve the next page. Absent when `hasMore` is `false`.",
    example: "eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTIzVDEyOjAwOjAwWiJ9",
  }),
};

export const TagSchema = z
  .object({
    id: z.string().openapi({ example: "tag_01abc" }),
    name: z.string().openapi({ example: "mobile" }),
    color: z.string().openapi({ example: "#6366f1" }),
  })
  .openapi("Tag");

export const STATUS_VALUES = ["open", "reviewing", "planned", "in-progress", "completed", "closed"] as const;
export const StatusEnum = z.enum(STATUS_VALUES);

// ── Shared error response specs ──────────────────────────────────────────────
// Use these in createRoute() `responses` to document all standard error codes
// consistently across every router.

const errContent = (schema: typeof ErrorSchema) => ({
  "application/json": { schema },
});

export const Res401 = {
  description:
    "**Unauthorized** — API key is missing, malformed, or invalid. Pass a valid key in the `x-api-key` header. Regenerate in **Settings → API Keys** if expired.",
  content: errContent(ErrorSchema),
} as const;

export const Res400 = {
  description:
    "**Bad Request** — query parameters or request body failed basic validation. Check `details.fieldErrors` for per-field messages.",
  content: errContent(ErrorSchema),
} as const;

export const Res404 = {
  description:
    "**Not Found** — no resource with that ID exists within your organization. IDs are org-scoped; a valid ID from another org will also 404.",
  content: errContent(ErrorSchema),
} as const;

export const Res422 = {
  description:
    "**Unprocessable Entity** — request body is structurally valid JSON but fails business-rule validation (e.g. missing required fields, values out of range). Inspect `details.fieldErrors`.",
  content: errContent(ErrorSchema),
} as const;

export const Res429 = {
  description:
    "**Too Many Requests** — more than 60 requests per minute from this API key. Wait the number of seconds indicated by the `Retry-After` response header before retrying.",
  content: errContent(ErrorSchema),
} as const;

export const Res500 = {
  description:
    "**Internal Server Error** — an unexpected server-side failure. Retry once with exponential back-off. If the problem persists, contact support.",
  content: errContent(ErrorSchema),
} as const;

export const API_ERRORS = {
  // 400
  invalid_params: {
    status: 400,
    message: "Invalid query parameters",
    cause: "One or more query parameters failed validation",
    fix: "Check `details.fieldErrors` for per-field messages",
  },
  invalid_body: {
    status: 400,
    message: "Invalid JSON body",
    cause: "Request body is not valid JSON",
    fix: "Ensure `Content-Type: application/json` and the body is valid JSON",
  },
  cannot_reply_to_reply: {
    status: 400,
    message: "Cannot reply to a reply",
    cause: "The target comment is itself a reply — nesting is limited to one level",
    fix: "Reply to the top-level comment instead",
  },
  cannot_delete_default_board: {
    status: 400,
    message: "Cannot delete the default board",
    cause: "The default board cannot be deleted; it is required to receive migrated posts",
    fix: "Set a different board as the default before deleting this one",
  },
  // 401
  missing_api_key: {
    status: 401,
    message: "Missing or invalid Authorization header",
    cause: "`Authorization` header absent or malformed (not `Bearer <key>`)",
    fix: "Add `Authorization: Bearer YOUR_KEY` to every request",
  },
  invalid_api_key: {
    status: 401,
    message: "Invalid or expired API key",
    cause: "Key not found, disabled, deleted, or past its expiry date",
    fix: "Regenerate the key in **Settings → API Keys**",
  },
  // 404
  not_found: {
    status: 404,
    message: "Resource not found",
    cause: "Resource ID doesn't exist, or belongs to a different organization",
    fix: "Verify the ID and confirm the key's organization owns the resource",
  },
  post_not_found: {
    status: 404,
    message: "Post not found",
    cause: "Post ID doesn't exist in your org (used by votes and comments)",
    fix: "Verify `postId`",
  },
  user_not_found: {
    status: 404,
    message: "User not found",
    cause: "User profile ID doesn't exist in your org (used by votes and comments)",
    fix: "Call `POST /v1/users/identify` first to upsert the user",
  },
  parent_not_found: {
    status: 404,
    message: "Parent comment not found",
    cause: "`parentId` references a comment that doesn't exist in this post",
    fix: "Verify `parentId`",
  },
  // 405
  method_not_allowed: {
    status: 405,
    message: "Method not allowed",
    cause: "HTTP method is not supported on this endpoint",
    fix: "Check the API reference for the allowed methods on this endpoint",
  },
  // 409
  conflict: {
    status: 409,
    message: "Conflict — duplicate name",
    cause: "A tag or category with that name already exists in your org",
    fix: "Use a unique name or `GET` the existing resource",
  },
  already_voted: {
    status: 409,
    message: "User has already voted on this post",
    cause: "The identified user already cast a vote on this post",
    fix: "Check votes first with `GET /v1/votes?postId=...` or treat as a no-op",
  },
  already_member: {
    status: 409,
    message: "User is already a member of this company",
    cause: "The user profile is already linked to this company",
    fix: "Check members first with `GET /v1/companies/:id/members` or treat as a no-op",
  },
  // 422
  validation_error: {
    status: 422,
    message: "Validation failed",
    cause: "One or more request body fields failed validation",
    fix: "Check `details.fieldErrors` for per-field messages and `details.formErrors` for form-level messages",
  },
  limit_reached: {
    status: 422,
    message: "Resource limit reached",
    cause: "Organization has reached the maximum allowed count for this resource (e.g. 10 webhook endpoints)",
    fix: "Delete unused resources before creating new ones",
  },
  // 429
  rate_limit_exceeded: {
    status: 429,
    message: "Rate limit exceeded",
    cause: "More than 60 requests per minute from this API key",
    fix: "Wait `Retry-After` seconds before retrying; use `limit: 100` to reduce round trips",
  },
  // 500
  server_error: {
    status: 500,
    message: "Internal server error",
    cause: "An unexpected error occurred on the server",
    fix: "Retry once with exponential back-off; contact support if it persists",
  },
} as const;

export type ApiErrorCode = keyof typeof API_ERRORS;

export type ApiErrorBody = {
  error: string;
  code: ApiErrorCode;
  details?: unknown;
};

export function apiError(
  code: ApiErrorCode,
  details?: unknown,
): { body: ApiErrorBody; init: { status: number } } {
  const { status, message } = API_ERRORS[code];
  return {
    body: { error: message, code, ...(details !== undefined ? { details } : {}) },
    init: { status },
  };
}

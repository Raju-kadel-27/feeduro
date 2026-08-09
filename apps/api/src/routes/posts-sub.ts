import {
  ListStatusChangesSchema,
  listStatusChanges,
} from "@feeduro/data-access/feedback/status-changes";
import {
  AddTagToPostSchema,
  addPostTag,
  removePostTag,
} from "@feeduro/data-access/feedback/tags";
import { apiError } from "@feeduro/errors";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDb } from "../db";
import type { Env } from "../env";
import { apiKeyMiddleware } from "../middleware/api-key";
import { ErrorSchema, PaginationMeta, StatusEnum } from "../schemas/common";

const security = [{ apiKey: [] }];
const errResponses = {
  401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
} as const;

// ── Post tags ─────────────────────────────────────────────────────────────────

const addTagRoute = createRoute({
  method: "post",
  path: "/:id/tags",
  tags: ["Posts"],
  summary: "Add tag to post",
  security,
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: AddTagToPostSchema } } },
  },
  responses: {
    201: { description: "Added", content: { "application/json": { schema: z.object({ data: z.object({ postId: z.string(), tagId: z.string() }) }) } } },
    ...errResponses,
  },
});

const removeTagRoute = createRoute({
  method: "delete",
  path: "/:id/tags/:tagId",
  tags: ["Posts"],
  summary: "Remove tag from post",
  security,
  request: { params: z.object({ id: z.string(), tagId: z.string() }) },
  responses: {
    200: { description: "Removed", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    ...errResponses,
  },
});

// ── Status changes ────────────────────────────────────────────────────────────

const StatusChangeSchema = z.object({
  id: z.string(),
  postId: z.string(),
  oldStatus: StatusEnum.nullable(),
  newStatus: StatusEnum.nullable(),
  changedById: z.string().nullable(),
  changedByName: z.string().nullable(),
  createdAt: z.string().datetime(),
}).openapi("StatusChange");

const listStatusChangesRoute = createRoute({
  method: "get",
  path: "/:id/status-changes",
  tags: ["Posts"],
  summary: "List status changes",
  description: "Returns the status change history for a post, newest first.",
  security,
  request: {
    params: z.object({ id: z.string() }),
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).default(25),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: z.array(StatusChangeSchema), ...PaginationMeta }) } } },
    ...errResponses,
  },
});

export const postsSubRouter = new OpenAPIHono<Env>()
  .use(apiKeyMiddleware)
  .openapi(addTagRoute, async (c) => {
    const { id } = c.req.valid("param");
    const result = await addPostTag(getDb(c), c.get("organizationId"), id, c.req.valid("json").tagId);
    if ("error" in result) return c.json(apiError("not_found").body, 404);
    return c.json({ data: result.data }, 201);
  })
  .openapi(removeTagRoute, async (c) => {
    const { id, tagId } = c.req.valid("param");
    const ok = await removePostTag(getDb(c), c.get("organizationId"), id, tagId);
    if (!ok) return c.json(apiError("not_found").body, 404);
    return c.json({ success: true as const }, 200);
  })
  .openapi(listStatusChangesRoute, async (c) => {
    const result = await listStatusChanges(getDb(c), c.get("organizationId"), c.req.valid("param").id, c.req.valid("query"));
    if (!result) return c.json(apiError("not_found").body, 404);
    return c.json(result as never, 200);
  });

import {
  CreateCommentSchema,
  createComment,
  deleteComment,
  getComment,
  ListCommentsSchema,
  listComments,
  pinComment,
  UpdateCommentSchema,
  updateComment,
} from "@feeduro/data-access/feedback/comments";
import { apiError } from "@feeduro/errors";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDb } from "../db";
import type { Env } from "../env";
import { apiKeyMiddleware } from "../middleware/api-key";
import { ErrorSchema, PaginationMeta } from "../schemas/common";

const CommentAuthorSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
});

const CommentSchema = z
  .object({
    id: z.string().openapi({ example: "cmt_01abc" }),
    postId: z.string().openapi({ example: "post_01abc" }),
    userId: z.string().nullable().openapi({ description: "User profile ID" }),
    parentId: z.string().nullable().openapi({ description: "Parent comment ID for threaded replies" }),
    body: z.string(),
    isPinned: z.boolean(),
    author: CommentAuthorSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Comment");

const CommentListSchema = z
  .object({ data: z.array(CommentSchema), ...PaginationMeta })
  .openapi("CommentList");

const security = [{ apiKey: [] }];
const errResponses = {
  401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
};

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Comments"],
  summary: "List comments",
  description: "Returns paginated public comments for a post.",
  security,
  request: {
    query: z.object({
      postId: z.string().min(1).openapi({ description: "Post ID to list comments for" }),
      limit: z.coerce.number().int().min(1).max(100).default(25),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: CommentListSchema } } },
    ...errResponses,
  },
});

const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Comments"],
  summary: "Create a comment",
  description: "Adds a public comment to a post. `userId` must be a profile ID from `POST /v1/users/identify`.",
  security,
  request: { body: { content: { "application/json": { schema: CreateCommentSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: z.object({ data: CommentSchema }) } } },
    ...errResponses,
    422: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
  },
});

const getRoute = createRoute({
  method: "get",
  path: "/:id",
  tags: ["Comments"],
  summary: "Get a comment",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: CommentSchema }) } } },
    ...errResponses,
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/:id",
  tags: ["Comments"],
  summary: "Update a comment",
  description: "Updates the body of an existing comment.",
  security,
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: UpdateCommentSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: z.object({ data: CommentSchema }) } } },
    ...errResponses,
  },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Comments"],
  summary: "Delete a comment",
  description: "Deletes a comment and all its replies.",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    ...errResponses,
  },
});

const pinRoute = createRoute({
  method: "put",
  path: "/:id/pin",
  tags: ["Comments"],
  summary: "Pin a comment",
  description: "Pins a comment to the top of the thread. Only one comment per post can be pinned at a time.",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Pinned", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    400: { description: "Cannot pin a reply", content: { "application/json": { schema: ErrorSchema } } },
    ...errResponses,
  },
});

const unpinRoute = createRoute({
  method: "delete",
  path: "/:id/pin",
  tags: ["Comments"],
  summary: "Unpin a comment",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Unpinned", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    400: { description: "Cannot unpin a reply", content: { "application/json": { schema: ErrorSchema } } },
    ...errResponses,
  },
});

export const commentsRouter = new OpenAPIHono<Env>()
  .use(apiKeyMiddleware)
  .openapi(listRoute, async (c) => {
    const result = await listComments(getDb(c), c.get("organizationId"), c.req.valid("query"));
    if (!result) return c.json(apiError("not_found").body, 404);
    return c.json(result as never, 200);
  })
  .openapi(createRoute_, async (c) => {
    const result = await createComment(getDb(c), c.get("organizationId"), c.req.valid("json"));
    if ("error" in result) return c.json(apiError(result.error).body, result.error === "cannot_reply_to_reply" ? 422 : 404);
    return c.json({ data: result.data } as never, 201);
  })
  .openapi(getRoute, async (c) => {
    const comment = await getComment(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!comment) return c.json(apiError("not_found").body, 404);
    return c.json({ data: comment } as never, 200);
  })
  .openapi(updateRoute, async (c) => {
    const comment = await updateComment(getDb(c), c.get("organizationId"), c.req.valid("param").id, c.req.valid("json"));
    if (!comment) return c.json(apiError("not_found").body, 404);
    return c.json({ data: comment } as never, 200);
  })
  .openapi(deleteRoute, async (c) => {
    const deleted = await deleteComment(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!deleted) return c.json(apiError("not_found").body, 404);
    return c.json({ success: true as const }, 200);
  })
  .openapi(pinRoute, async (c) => {
    const result = await pinComment(getDb(c), c.get("organizationId"), c.req.valid("param").id, true);
    if (result === "not_found") return c.json(apiError("not_found").body, 404);
    if (result === "cannot_pin_reply") return c.json(apiError("cannot_reply_to_reply").body, 400);
    return c.json({ success: true as const }, 200);
  })
  .openapi(unpinRoute, async (c) => {
    const result = await pinComment(getDb(c), c.get("organizationId"), c.req.valid("param").id, false);
    if (result === "not_found") return c.json(apiError("not_found").body, 404);
    if (result === "cannot_pin_reply") return c.json(apiError("cannot_reply_to_reply").body, 400);
    return c.json({ success: true as const }, 200);
  });

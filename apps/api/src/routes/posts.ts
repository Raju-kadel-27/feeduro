import { CreatePostSchema, getPost, ListPostsSchema, listPosts, UpdatePostSchema } from "@feeduro/data-access/feedback/posts";
import { createPost, deletePost, updatePost } from "@feeduro/data-access/feedback/posts-mutations";
import { apiError } from "@feeduro/errors";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDb } from "../db";
import type { Env } from "../env";
import { apiKeyMiddleware } from "../middleware/api-key";
import { ErrorSchema, PaginationMeta, StatusEnum, TagSchema } from "../schemas/common";

const PostSchema = z
  .object({
    id: z.string().openapi({ example: "post_01abc" }),
    boardId: z.string().openapi({ example: "board_01abc" }),
    title: z.string().openapi({ example: "Support dark mode" }),
    description: z.string().nullable().openapi({ example: "Would love a dark theme option." }),
    status: StatusEnum,
    categoryId: z.string().nullable(),
    voteCount: z.number().openapi({ example: 42 }),
    isPublicSubmission: z.boolean(),
    createdBy: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    tags: z.array(TagSchema),
  })
  .openapi("Post");

const PostListSchema = z
  .object({ data: z.array(PostSchema), ...PaginationMeta })
  .openapi("PostList");

const security = [{ apiKey: [] }];
const errorResponses = {
  401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  422: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
} as const;

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Posts"],
  summary: "List posts",
  description: "Returns paginated feedback posts for your organization.",
  security,
  request: {
    query: z.object({
      boardId: z.string().optional().openapi({ description: "Filter by board ID" }),
      status: StatusEnum.optional().openapi({ description: "Filter by status" }),
      limit: z.coerce.number().int().min(1).max(100).default(25).openapi({ example: 25 }),
      cursor: z.string().optional().openapi({ description: "Pagination cursor from previous response" }),
    }),
  },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: PostListSchema } } },
    ...errorResponses,
  },
});

const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Posts"],
  summary: "Create a post",
  security,
  request: { body: { content: { "application/json": { schema: CreatePostSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: z.object({ data: PostSchema }) } } },
    ...errorResponses,
  },
});

const getRoute = createRoute({
  method: "get",
  path: "/:id",
  tags: ["Posts"],
  summary: "Get a post",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: PostSchema }) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/:id",
  tags: ["Posts"],
  summary: "Update a post",
  security,
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: UpdatePostSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: z.object({ data: PostSchema }) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Posts"],
  summary: "Delete a post",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

export const postsRouter = new OpenAPIHono<Env>()
  .use(apiKeyMiddleware)
  .openapi(listRoute, async (c) => {
    const db = getDb(c);
    const orgId = c.get("organizationId");
    const result = await listPosts(db, orgId, c.req.valid("query"));
    return c.json(result as z.infer<typeof PostListSchema>, 200);
  })
  .openapi(createRoute_, async (c) => {
    const db = getDb(c);
    const orgId = c.get("organizationId");
    const post = await createPost(db, orgId, c.req.valid("json"));
    if (!post) return c.json(apiError("not_found").body, 404);
    return c.json({ data: post } as never, 201);
  })
  .openapi(getRoute, async (c) => {
    const db = getDb(c);
    const orgId = c.get("organizationId");
    const post = await getPost(db, orgId, c.req.valid("param").id);
    if (!post) return c.json(apiError("not_found").body, 404);
    return c.json({ data: post } as never, 200);
  })
  .openapi(updateRoute, async (c) => {
    const db = getDb(c);
    const orgId = c.get("organizationId");
    const post = await updatePost(db, orgId, c.req.valid("param").id, c.req.valid("json"));
    if (!post) return c.json(apiError("not_found").body, 404);
    return c.json({ data: post } as never, 200);
  })
  .openapi(deleteRoute, async (c) => {
    const db = getDb(c);
    const orgId = c.get("organizationId");
    const deleted = await deletePost(db, orgId, c.req.valid("param").id);
    if (!deleted) return c.json(apiError("not_found").body, 404);
    return c.json({ success: true as const }, 200);
  });

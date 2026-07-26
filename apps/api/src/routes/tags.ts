import { CreateTagSchema, createOrgTag, deleteOrgTag, listTags } from "@feeduro/data-access/feedback/tags";
import { apiError } from "@feeduro/errors";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDb } from "../db";
import type { Env } from "../env";
import { apiKeyMiddleware } from "../middleware/api-key";
import { ErrorSchema, TagSchema } from "../schemas/common";

const security = [{ apiKey: [] }];
const errorResponses = {
  401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
} as const;

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Tags"],
  summary: "List tags",
  description: "Returns all tags for your organization.",
  security,
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: z.array(TagSchema) }) } } },
    ...errorResponses,
  },
});

const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Tags"],
  summary: "Create a tag",
  security,
  request: { body: { content: { "application/json": { schema: CreateTagSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: z.object({ data: TagSchema }) } } },
    409: { description: "Tag name already exists", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Tags"],
  summary: "Delete a tag",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

export const tagsRouter = new OpenAPIHono<Env>()
  .use(apiKeyMiddleware)
  .openapi(listRoute, async (c) => {
    const tags = await listTags(getDb(c), c.get("organizationId"));
    return c.json({ data: tags } as never, 200);
  })
  .openapi(createRoute_, async (c) => {
    const result = await createOrgTag(getDb(c), c.get("organizationId"), c.req.valid("json"));
    if ("error" in result) return c.json(apiError("conflict").body, 409);
    return c.json(result as never, 201);
  })
  .openapi(deleteRoute, async (c) => {
    const deleted = await deleteOrgTag(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!deleted) return c.json(apiError("not_found").body, 404);
    return c.json({ success: true as const }, 200);
  });

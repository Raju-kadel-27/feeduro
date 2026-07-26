import {
  CreateChangelogSchema,
  createChangelog,
  getChangelog,
  ListChangelogSchema,
  listChangelogs,
} from "@feeduro/data-access/changelog/changelog";
import { apiError } from "@feeduro/errors";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDb } from "../db";
import type { Env } from "../env";
import { apiKeyMiddleware } from "../middleware/api-key";
import { ErrorSchema, PaginationMeta } from "../schemas/common";

const ChangelogSchema = z
  .object({
    id: z.string().openapi({ example: "cl_01abc" }),
    title: z.string().openapi({ example: "New dashboard UI" }),
    slug: z.string().openapi({ example: "new-dashboard-ui" }),
    body: z.string().optional().openapi({ description: "JSON-encoded block content" }),
    status: z.enum(["draft", "published"]),
    publishedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Changelog");

const security = [{ apiKey: [] }];
const errorResponses = {
  401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
} as const;

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Changelog"],
  summary: "List changelog entries",
  description: "Returns paginated changelog entries for your organization.",
  security,
  request: {
    query: z.object({
      status: z.enum(["draft", "published"]).optional().openapi({ description: "Filter by status" }),
      limit: z.coerce.number().int().min(1).max(100).default(25).openapi({ example: 25 }),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: z.array(ChangelogSchema), ...PaginationMeta }) } } },
    ...errorResponses,
  },
});

const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Changelog"],
  summary: "Create a changelog entry",
  security,
  request: { body: { content: { "application/json": { schema: CreateChangelogSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: z.object({ data: ChangelogSchema }) } } },
    ...errorResponses,
  },
});

const getRoute = createRoute({
  method: "get",
  path: "/:id",
  tags: ["Changelog"],
  summary: "Get a changelog entry",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: ChangelogSchema }) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

export const changelogRouter = new OpenAPIHono<Env>()
  .use(apiKeyMiddleware)
  .openapi(listRoute, async (c) => {
    const result = await listChangelogs(getDb(c), c.get("organizationId"), c.req.valid("query"));
    return c.json(result as never, 200);
  })
  .openapi(createRoute_, async (c) => {
    const entry = await createChangelog(getDb(c), c.get("organizationId"), c.req.valid("json"));
    return c.json({ data: entry } as never, 201);
  })
  .openapi(getRoute, async (c) => {
    const entry = await getChangelog(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!entry) return c.json(apiError("not_found").body, 404);
    return c.json({ data: entry } as never, 200);
  });

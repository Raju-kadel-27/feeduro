import {
  CreateChangelogSchema,
  createChangelog,
  getChangelog,
  ListChangelogSchema,
  listChangelogs,
} from "@feeduro/data-access/changelog/changelog";
import {
  deleteChangelog,
  UpdateChangelogSchema,
  updateChangelog,
} from "@feeduro/data-access/changelog/changelog-mutations";
import {
  AddChangelogTagSchema,
  CreateChangelogTagSchema,
  createChangelogTag,
  deleteChangelogTag,
  listChangelogTags,
} from "@feeduro/data-access/changelog/changelog-tags";
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

const ChangelogTagSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string().datetime(),
  })
  .openapi("ChangelogTag");

const security = [{ apiKey: [] }];
const errResponses = {
  401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
} as const;

// ── Catalog routes (registered before /:id to avoid param shadowing) ─────────

const listTagsRoute = createRoute({
  method: "get",
  path: "/tags",
  tags: ["Changelog"],
  summary: "List changelog tags",
  description: "Returns all changelog tags for your organization.",
  security,
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: z.array(ChangelogTagSchema) }) } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

const createTagRoute = createRoute({
  method: "post",
  path: "/tags",
  tags: ["Changelog"],
  summary: "Create a changelog tag",
  security,
  request: { body: { content: { "application/json": { schema: CreateChangelogTagSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: z.object({ data: ChangelogTagSchema }) } } },
    409: { description: "Tag name already exists", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

const deleteTagRoute = createRoute({
  method: "delete",
  path: "/tags/:tagId",
  tags: ["Changelog"],
  summary: "Delete a changelog tag",
  security,
  request: { params: z.object({ tagId: z.string() }) },
  responses: {
    200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    ...errResponses,
  },
});

// ── Changelog CRUD ────────────────────────────────────────────────────────────

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Changelog"],
  summary: "List changelog entries",
  description: "Returns paginated changelog entries for your organization.",
  security,
  request: {
    query: z.object({
      status: z.enum(["draft", "published"]).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(25),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: z.array(ChangelogSchema), ...PaginationMeta }) } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
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
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
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
    ...errResponses,
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/:id",
  tags: ["Changelog"],
  summary: "Update a changelog entry",
  description: "Updates title, body, or status. Setting `status` to `published` for the first time sets `publishedAt`.",
  security,
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: UpdateChangelogSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: z.object({ data: ChangelogSchema }) } } },
    ...errResponses,
  },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Changelog"],
  summary: "Delete a changelog entry",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    ...errResponses,
  },
});

export const changelogRouter = new OpenAPIHono<Env>()
  .use(apiKeyMiddleware)
  // Catalog tag routes first — must precede /:id to avoid shadowing
  .openapi(listTagsRoute, async (c) => {
    const tags = await listChangelogTags(getDb(c), c.get("organizationId"));
    return c.json({ data: tags } as never, 200);
  })
  .openapi(createTagRoute, async (c) => {
    const result = await createChangelogTag(getDb(c), c.get("organizationId"), c.req.valid("json"));
    if ("error" in result) return c.json(apiError("conflict").body, 409);
    return c.json({ data: result.data } as never, 201);
  })
  .openapi(deleteTagRoute, async (c) => {
    const ok = await deleteChangelogTag(getDb(c), c.get("organizationId"), c.req.valid("param").tagId);
    if (!ok) return c.json(apiError("not_found").body, 404);
    return c.json({ success: true as const }, 200);
  })
  // Changelog CRUD
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
  })
  .openapi(updateRoute, async (c) => {
    const entry = await updateChangelog(getDb(c), c.get("organizationId"), c.req.valid("param").id, c.req.valid("json"));
    if (!entry) return c.json(apiError("not_found").body, 404);
    return c.json({ data: entry } as never, 200);
  })
  .openapi(deleteRoute, async (c) => {
    const ok = await deleteChangelog(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!ok) return c.json(apiError("not_found").body, 404);
    return c.json({ success: true as const }, 200);
  });

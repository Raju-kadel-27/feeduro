import {
  AddChangelogAuthorSchema,
  addChangelogAuthor,
  listChangelogAuthors,
  removeChangelogAuthor,
} from "@feeduro/data-access/changelog/changelog-authors";
import {
  AddChangelogRequestSchema,
  addChangelogRequest,
  listChangelogRequests,
  removeChangelogRequest,
} from "@feeduro/data-access/changelog/changelog-requests";
import {
  AddChangelogTagSchema,
  addChangelogTagItem,
  listChangelogTagItems,
  removeChangelogTagItem,
} from "@feeduro/data-access/changelog/changelog-tags";
import { apiError } from "@feeduro/errors";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDb } from "../db";
import type { Env } from "../env";
import { apiKeyMiddleware } from "../middleware/api-key";
import { ErrorSchema } from "../schemas/common";

const security = [{ apiKey: [] }];
const idParam = z.object({ id: z.string() });
const errResponses = {
  401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
} as const;

// ── Authors ───────────────────────────────────────────────────────────────────

const AuthorSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  addedAt: z.string().datetime(),
}).openapi("ChangelogAuthor");

const listAuthorsRoute = createRoute({
  method: "get", path: "/:id/authors", tags: ["Changelog"], summary: "List changelog authors",
  security, request: { params: idParam },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: z.array(AuthorSchema) }) } } },
    ...errResponses,
  },
});

const addAuthorRoute = createRoute({
  method: "post", path: "/:id/authors", tags: ["Changelog"], summary: "Add author to changelog",
  security,
  request: { params: idParam, body: { content: { "application/json": { schema: AddChangelogAuthorSchema } } } },
  responses: {
    201: { description: "Added", content: { "application/json": { schema: z.object({ data: z.object({ changelogId: z.string(), userId: z.string() }) }) } } },
    ...errResponses,
  },
});

const removeAuthorRoute = createRoute({
  method: "delete", path: "/:id/authors/:authorId", tags: ["Changelog"], summary: "Remove author from changelog",
  security, request: { params: z.object({ id: z.string(), authorId: z.string() }) },
  responses: {
    200: { description: "Removed", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    ...errResponses,
  },
});

// ── Requests (linked posts) ───────────────────────────────────────────────────

const RequestSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  addedAt: z.string().datetime(),
}).openapi("ChangelogRequest");

const listRequestsRoute = createRoute({
  method: "get", path: "/:id/requests", tags: ["Changelog"], summary: "List linked posts",
  description: "Returns feedback posts linked to this changelog entry.",
  security, request: { params: idParam },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: z.array(RequestSchema) }) } } },
    ...errResponses,
  },
});

const addRequestRoute = createRoute({
  method: "post", path: "/:id/requests", tags: ["Changelog"], summary: "Link a post to changelog",
  security,
  request: { params: idParam, body: { content: { "application/json": { schema: AddChangelogRequestSchema } } } },
  responses: {
    201: { description: "Linked", content: { "application/json": { schema: z.object({ data: z.object({ changelogId: z.string(), postId: z.string() }) }) } } },
    ...errResponses,
  },
});

const removeRequestRoute = createRoute({
  method: "delete", path: "/:id/requests/:postId", tags: ["Changelog"], summary: "Unlink a post from changelog",
  security, request: { params: z.object({ id: z.string(), postId: z.string() }) },
  responses: {
    200: { description: "Unlinked", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    ...errResponses,
  },
});

// ── Per-changelog tag associations ────────────────────────────────────────────

const TagItemSchema = z.object({ id: z.string(), name: z.string() }).openapi("ChangelogTagItem");

const listTagItemsRoute = createRoute({
  method: "get", path: "/:id/tags", tags: ["Changelog"], summary: "List tags on changelog entry",
  security, request: { params: idParam },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: z.array(TagItemSchema) }) } } },
    ...errResponses,
  },
});

const addTagItemRoute = createRoute({
  method: "post", path: "/:id/tags", tags: ["Changelog"], summary: "Add tag to changelog entry",
  security,
  request: { params: idParam, body: { content: { "application/json": { schema: AddChangelogTagSchema } } } },
  responses: {
    201: { description: "Added", content: { "application/json": { schema: z.object({ data: z.object({ changelogId: z.string(), tagId: z.string() }) }) } } },
    ...errResponses,
  },
});

const removeTagItemRoute = createRoute({
  method: "delete", path: "/:id/tags/:tagId", tags: ["Changelog"], summary: "Remove tag from changelog entry",
  security, request: { params: z.object({ id: z.string(), tagId: z.string() }) },
  responses: {
    200: { description: "Removed", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    ...errResponses,
  },
});

export const changelogSubRouter = new OpenAPIHono<Env>()
  .use(apiKeyMiddleware)
  // Authors
  .openapi(listAuthorsRoute, async (c) => {
    const authors = await listChangelogAuthors(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!authors) return c.json(apiError("not_found").body, 404);
    return c.json({ data: authors } as never, 200);
  })
  .openapi(addAuthorRoute, async (c) => {
    const result = await addChangelogAuthor(getDb(c), c.get("organizationId"), c.req.valid("param").id, c.req.valid("json").userId);
    if ("error" in result) return c.json(apiError("not_found").body, 404);
    return c.json({ data: result.data }, 201);
  })
  .openapi(removeAuthorRoute, async (c) => {
    const { id, authorId } = c.req.valid("param");
    const ok = await removeChangelogAuthor(getDb(c), c.get("organizationId"), id, authorId);
    if (!ok) return c.json(apiError("not_found").body, 404);
    return c.json({ success: true as const }, 200);
  })
  // Requests
  .openapi(listRequestsRoute, async (c) => {
    const requests = await listChangelogRequests(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!requests) return c.json(apiError("not_found").body, 404);
    return c.json({ data: requests } as never, 200);
  })
  .openapi(addRequestRoute, async (c) => {
    const result = await addChangelogRequest(getDb(c), c.get("organizationId"), c.req.valid("param").id, c.req.valid("json").postId);
    if ("error" in result) return c.json(apiError("not_found").body, 404);
    return c.json({ data: result.data }, 201);
  })
  .openapi(removeRequestRoute, async (c) => {
    const { id, postId } = c.req.valid("param");
    const ok = await removeChangelogRequest(getDb(c), c.get("organizationId"), id, postId);
    if (!ok) return c.json(apiError("not_found").body, 404);
    return c.json({ success: true as const }, 200);
  })
  // Tag associations
  .openapi(listTagItemsRoute, async (c) => {
    const tags = await listChangelogTagItems(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!tags) return c.json(apiError("not_found").body, 404);
    return c.json({ data: tags }, 200);
  })
  .openapi(addTagItemRoute, async (c) => {
    const result = await addChangelogTagItem(getDb(c), c.get("organizationId"), c.req.valid("param").id, c.req.valid("json").tagId);
    if ("error" in result) return c.json(apiError("not_found").body, 404);
    return c.json({ data: result.data }, 201);
  })
  .openapi(removeTagItemRoute, async (c) => {
    const { id, tagId } = c.req.valid("param");
    const ok = await removeChangelogTagItem(getDb(c), c.get("organizationId"), id, tagId);
    if (!ok) return c.json(apiError("not_found").body, 404);
    return c.json({ success: true as const }, 200);
  });

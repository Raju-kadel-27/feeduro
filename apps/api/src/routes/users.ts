import { IdentifyUserSchema } from "@feeduro/data-access/users/identify-schema";
import { upsertUserProfile } from "@feeduro/data-access/users/mutations";
import { deleteUser, getUser, ListUsersSchema, listUsers } from "@feeduro/data-access/users/users";
import { apiError } from "@feeduro/errors";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDb } from "../db";
import type { Env } from "../env";
import { apiKeyMiddleware } from "../middleware/api-key";
import { ErrorSchema, PaginationMeta } from "../schemas/common";

const UserSchema = z
  .object({
    id: z.string().openapi({ example: "up_01abc" }),
    externalId: z.string().nullable().openapi({ example: "usr_12345" }),
    email: z.string().email().openapi({ example: "alice@example.com" }),
    name: z.string().nullable().openapi({ example: "Alice" }),
    plan: z.string().nullable(),
    role: z.string().nullable(),
    companySize: z.number().nullable(),
    industry: z.string().nullable(),
    location: z.string().nullable(),
    customAttributes: z.record(z.string(), z.unknown()).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("User");

const security = [{ apiKey: [] }];
const errorResponses = {
  401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
} as const;

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Users"],
  summary: "List users",
  description: "Returns paginated user profiles that have been identified via the API.",
  security,
  request: {
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).default(25).openapi({ example: 25 }),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: z.array(UserSchema), ...PaginationMeta }) } } },
    ...errorResponses,
  },
});

const identifyRoute = createRoute({
  method: "post",
  path: "/identify",
  tags: ["Users"],
  summary: "Identify a user",
  description: "Upserts a user profile. Call this before casting votes or posting comments on behalf of a user.",
  security,
  request: { body: { content: { "application/json": { schema: IdentifyUserSchema } } } },
  responses: {
    200: { description: "Identified", content: { "application/json": { schema: z.object({ data: z.object({ id: z.string() }) }) } } },
    ...errorResponses,
  },
});

const getRoute = createRoute({
  method: "get",
  path: "/:id",
  tags: ["Users"],
  summary: "Get a user",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: UserSchema }) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Users"],
  summary: "Delete a user",
  description: "Permanently deletes a user profile and all associated data.",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

export const usersRouter = new OpenAPIHono<Env>()
  .use(apiKeyMiddleware)
  .openapi(listRoute, async (c) => {
    const result = await listUsers(getDb(c), c.get("organizationId"), c.req.valid("query"));
    return c.json(result as never, 200);
  })
  .openapi(identifyRoute, async (c) => {
    const id = await upsertUserProfile(getDb(c), c.get("organizationId"), c.req.valid("json"));
    return c.json({ data: { id } }, 200);
  })
  .openapi(getRoute, async (c) => {
    const profile = await getUser(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!profile) return c.json(apiError("not_found").body, 404);
    return c.json({ data: profile } as never, 200);
  })
  .openapi(deleteRoute, async (c) => {
    const deleted = await deleteUser(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!deleted) return c.json(apiError("not_found").body, 404);
    return c.json({ success: true as const }, 200);
  });

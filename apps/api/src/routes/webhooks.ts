import { getWebhook, listWebhooks } from "@feeduro/data-access/webhooks/queries";
import { CreateWebhookSchema, createWebhook, deleteWebhook, UpdateWebhookSchema, updateWebhook } from "@feeduro/data-access/webhooks/webhooks";
import { apiError } from "@feeduro/errors";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDb } from "../db";
import type { Env } from "../env";
import { apiKeyMiddleware } from "../middleware/api-key";
import { ErrorSchema } from "../schemas/common";

const WebhookSchema = z
  .object({
    id: z.string().openapi({ example: "wh_01abc" }),
    name: z.string().nullable(),
    url: z.string().url().openapi({ example: "https://yourapp.com/webhooks/feeduro" }),
    events: z.array(z.string()).openapi({ example: ["post.created", "post.status_changed"] }),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Webhook");

const security = [{ apiKey: [] }];
const errorResponses = {
  401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
} as const;

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Webhooks"],
  summary: "List webhooks",
  description: "Returns all webhook endpoints for your organization.",
  security,
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: z.array(WebhookSchema) }) } } },
    ...errorResponses,
  },
});

const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Webhooks"],
  summary: "Create a webhook",
  description: "Creates a new webhook endpoint. Maximum 10 endpoints per organization.",
  security,
  request: { body: { content: { "application/json": { schema: CreateWebhookSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: z.object({ data: WebhookSchema }) } } },
    422: { description: "Limit reached", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

const getRoute = createRoute({
  method: "get",
  path: "/:id",
  tags: ["Webhooks"],
  summary: "Get a webhook",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: WebhookSchema }) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/:id",
  tags: ["Webhooks"],
  summary: "Update a webhook",
  security,
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: UpdateWebhookSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Webhooks"],
  summary: "Delete a webhook",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

export const webhooksRouter = new OpenAPIHono<Env>()
  .use(apiKeyMiddleware)
  .openapi(listRoute, async (c) => {
    const data = await listWebhooks(getDb(c), c.get("organizationId"));
    return c.json({ data } as never, 200);
  })
  .openapi(createRoute_, async (c) => {
    const result = await createWebhook(getDb(c), c.get("organizationId"), c.req.valid("json"));
    if ("error" in result) return c.json(apiError("limit_reached").body, 422);
    return c.json({ data: result } as never, 201);
  })
  .openapi(getRoute, async (c) => {
    const ep = await getWebhook(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!ep) return c.json(apiError("not_found").body, 404);
    return c.json({ data: ep } as never, 200);
  })
  .openapi(updateRoute, async (c) => {
    const ok = await updateWebhook(getDb(c), c.get("organizationId"), c.req.valid("param").id, c.req.valid("json"));
    if (!ok) return c.json(apiError("not_found").body, 404);
    return c.json({ success: true as const }, 200);
  })
  .openapi(deleteRoute, async (c) => {
    const deleted = await deleteWebhook(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!deleted) return c.json(apiError("not_found").body, 404);
    return c.json({ success: true as const }, 200);
  });

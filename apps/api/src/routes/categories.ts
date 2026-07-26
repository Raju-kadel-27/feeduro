import { CreateCategorySchema, createOrgCategory, deleteOrgCategory, listCategories } from "@feeduro/data-access/feedback/categories";
import { apiError } from "@feeduro/errors";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDb } from "../db";
import type { Env } from "../env";
import { apiKeyMiddleware } from "../middleware/api-key";
import { ErrorSchema } from "../schemas/common";

const CategorySchema = z
  .object({
    id: z.string().openapi({ example: "cat_01abc" }),
    name: z.string().openapi({ example: "Bug" }),
    color: z.string().openapi({ example: "#ef4444" }),
  })
  .openapi("Category");

const security = [{ apiKey: [] }];
const errorResponses = {
  401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
} as const;

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Categories"],
  summary: "List categories",
  description: "Returns all post categories for your organization.",
  security,
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: z.array(CategorySchema) }) } } },
    ...errorResponses,
  },
});

const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Categories"],
  summary: "Create a category",
  security,
  request: { body: { content: { "application/json": { schema: CreateCategorySchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: z.object({ data: CategorySchema }) } } },
    409: { description: "Category name already exists", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Categories"],
  summary: "Delete a category",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

export const categoriesRouter = new OpenAPIHono<Env>()
  .use(apiKeyMiddleware)
  .openapi(listRoute, async (c) => {
    const categories = await listCategories(getDb(c), c.get("organizationId"));
    return c.json({ data: categories } as never, 200);
  })
  .openapi(createRoute_, async (c) => {
    const result = await createOrgCategory(getDb(c), c.get("organizationId"), c.req.valid("json"));
    if ("error" in result) return c.json(apiError("conflict").body, 409);
    return c.json(result as never, 201);
  })
  .openapi(deleteRoute, async (c) => {
    const deleted = await deleteOrgCategory(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!deleted) return c.json(apiError("not_found").body, 404);
    return c.json({ success: true as const }, 200);
  });

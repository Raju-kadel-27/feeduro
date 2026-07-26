import { ListRoadmapSchema, listRoadmap, UpdateRoadmapPostSchema, updateRoadmapPost } from "@feeduro/data-access/roadmap/roadmap";
import { apiError } from "@feeduro/errors";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDb } from "../db";
import type { Env } from "../env";
import { apiKeyMiddleware } from "../middleware/api-key";
import { ErrorSchema, StatusEnum } from "../schemas/common";

const RoadmapPostSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    status: StatusEnum,
    rank: z.number().nullable(),
    voteCount: z.number(),
    boardId: z.string(),
    categoryId: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("RoadmapPost");

const RoadmapSchema = z
  .object({
    data: z.object({
      columns: z.record(StatusEnum, z.array(RoadmapPostSchema)),
    }),
  })
  .openapi("Roadmap");

const security = [{ apiKey: [] }];
const errorResponses = {
  401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
} as const;

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Roadmap"],
  summary: "Get roadmap",
  description: "Returns posts grouped by status columns for roadmap views.",
  security,
  request: {
    query: z.object({
      status: StatusEnum.optional().openapi({ description: "Return only one column" }),
    }),
  },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: RoadmapSchema } } },
    ...errorResponses,
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/posts/:id",
  tags: ["Roadmap"],
  summary: "Update a roadmap post",
  description: "Update a post's status or rank from the roadmap view.",
  security,
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: UpdateRoadmapPostSchema } } },
  },
  responses: {
    200: {
      description: "Updated",
      content: {
        "application/json": {
          schema: z.object({ data: z.object({ id: z.string(), status: StatusEnum, rank: z.number().nullable(), updatedAt: z.string().datetime() }) }),
        },
      },
    },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

export const roadmapRouter = new OpenAPIHono<Env>()
  .use(apiKeyMiddleware)
  .openapi(listRoute, async (c) => {
    const { status } = c.req.valid("query");
    const result = await listRoadmap(getDb(c), c.get("organizationId"), status);
    return c.json(result as never, 200);
  })
  .openapi(updateRoute, async (c) => {
    const updated = await updateRoadmapPost(getDb(c), c.get("organizationId"), c.req.valid("param").id, c.req.valid("json"));
    if (!updated) return c.json(apiError("not_found").body, 404);
    return c.json({ data: updated } as never, 200);
  });

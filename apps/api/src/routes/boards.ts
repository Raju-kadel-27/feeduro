import { getBoard, listBoards } from "@feeduro/data-access/feedback/boards";
import { apiError } from "@feeduro/errors";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDb } from "../db";
import type { Env } from "../env";
import { apiKeyMiddleware } from "../middleware/api-key";
import { ErrorSchema } from "../schemas/common";

const BoardSchema = z
  .object({
    id: z.string().openapi({ example: "board_01abc" }),
    name: z.string().openapi({ example: "Feature Requests" }),
    slug: z.string().openapi({ example: "feature-requests" }),
    description: z.string().nullable(),
    visibility: z.string().openapi({ example: "public" }),
    isDefault: z.boolean(),
    embedToken: z.string().nullable(),
    postCount: z.number().openapi({ example: 17 }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Board");

const security = [{ apiKey: [] }];

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Boards"],
  summary: "List boards",
  description: "Returns all feedback boards for your organization.",
  security,
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: z.array(BoardSchema) }) } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

const getRoute = createRoute({
  method: "get",
  path: "/:id",
  tags: ["Boards"],
  summary: "Get a board",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: BoardSchema }) } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const boardsRouter = new OpenAPIHono<Env>()
  .use(apiKeyMiddleware)
  .openapi(listRoute, async (c) => {
    const boards = await listBoards(getDb(c), c.get("organizationId"));
    return c.json({ data: boards } as never, 200);
  })
  .openapi(getRoute, async (c) => {
    const board = await getBoard(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!board) return c.json(apiError("not_found").body, 404);
    return c.json({ data: board } as never, 200);
  });

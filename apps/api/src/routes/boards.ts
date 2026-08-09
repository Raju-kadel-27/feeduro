import {
  createBoard,
  deleteBoard,
  getBoard,
  listBoards,
  updateBoard,
} from "@feeduro/data-access/feedback/boards";
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

const CreateBoardSchema = z
  .object({
    name: z.string().min(1).max(255).trim().openapi({ example: "Feature Requests" }),
    description: z.string().max(1000).trim().optional().openapi({ example: "Suggest new features" }),
    visibility: z.enum(["public", "private"]).default("public"),
  })
  .openapi("CreateBoard");

const UpdateBoardSchema = z
  .object({
    name: z.string().min(1).max(255).trim().optional(),
    description: z.string().max(1000).trim().nullable().optional(),
    visibility: z.enum(["public", "private"]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field is required" })
  .openapi("UpdateBoard");

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

const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Boards"],
  summary: "Create a board",
  description: "Creates a new feedback board for your organization.",
  security,
  request: { body: { content: { "application/json": { schema: CreateBoardSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: z.object({ data: BoardSchema }) } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
  },
});

const updateRoute = createRoute({
  method: "patch",
  path: "/:id",
  tags: ["Boards"],
  summary: "Update a board",
  description: "Updates an existing board's name, description, or visibility.",
  security,
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: UpdateBoardSchema } } },
  },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: BoardSchema }) } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Boards"],
  summary: "Delete a board",
  description:
    "Deletes a board. Posts are migrated to the default board if one exists. The default board itself cannot be deleted.",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    400: { description: "Cannot delete default board", content: { "application/json": { schema: ErrorSchema } } },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

export const boardsRouter = new OpenAPIHono<Env>()
  .use(apiKeyMiddleware)
  .openapi(listRoute, async (c) => {
    const boards = await listBoards(getDb(c), c.get("organizationId"));
    return c.json({ data: boards.map((b) => ({ ...b, embedToken: null })) } as never, 200);
  })
  .openapi(getRoute, async (c) => {
    const board = await getBoard(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!board) return c.json(apiError("not_found").body, 404);
    return c.json({ data: { ...board, embedToken: null } } as never, 200);
  })
  .openapi(createRoute_, async (c) => {
    const body = c.req.valid("json");
    const board = await createBoard(getDb(c), c.get("organizationId"), body);
    return c.json({ data: { ...board, embedToken: null } } as never, 201);
  })
  .openapi(updateRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const board = await updateBoard(getDb(c), c.get("organizationId"), id, body);
    if (!board) return c.json(apiError("not_found").body, 404);
    return c.json({ data: { ...board, embedToken: null } } as never, 200);
  })
  .openapi(deleteRoute, async (c) => {
    const { id } = c.req.valid("param");
    const result = await deleteBoard(getDb(c), c.get("organizationId"), id);
    if (!result.success) {
      if (result.reason === "not_found") return c.json(apiError("not_found").body, 404);
      return c.json(apiError("cannot_delete_default_board").body, 400);
    }
    return c.json({ success: true as const }, 200);
  });

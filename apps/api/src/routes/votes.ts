import { ListVotesSchema, listVotes } from "@feeduro/data-access/feedback/votes";
import { CreateVoteSchema, createVote, deleteVote } from "@feeduro/data-access/feedback/votes-mutations";
import { apiError } from "@feeduro/errors";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDb } from "../db";
import type { Env } from "../env";
import { apiKeyMiddleware } from "../middleware/api-key";
import { ErrorSchema, PaginationMeta } from "../schemas/common";

const VoteSchema = z
  .object({
    id: z.string().openapi({ example: "vote_01abc" }),
    postId: z.string(),
    userId: z.string().nullable(),
    userProfileId: z.string().nullable(),
    voterName: z.string().nullable(),
    voterEmail: z.string().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi("Vote");

const security = [{ apiKey: [] }];
const errorResponses = {
  401: { description: "Unauthorized", content: { "application/json": { schema: ErrorSchema } } },
} as const;

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Votes"],
  summary: "List votes",
  description: "Returns paginated votes. Filter by `postId` to get votes for a specific post.",
  security,
  request: {
    query: z.object({
      postId: z.string().optional().openapi({ description: "Filter by post ID" }),
      limit: z.coerce.number().int().min(1).max(100).default(25).openapi({ example: 25 }),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: z.object({ data: z.array(VoteSchema), ...PaginationMeta }) } } },
    ...errorResponses,
  },
});

const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Votes"],
  summary: "Cast a vote",
  description: "Cast a vote on behalf of a user. The user must have been identified first via `POST /v1/users/identify`.",
  security,
  request: { body: { content: { "application/json": { schema: CreateVoteSchema } } } },
  responses: {
    201: { description: "Voted", content: { "application/json": { schema: z.object({ data: z.object({ id: z.string(), postId: z.string(), userId: z.string(), voteCount: z.number(), createdAt: z.string().datetime() }) }) } } },
    404: { description: "Post or user not found", content: { "application/json": { schema: ErrorSchema } } },
    409: { description: "Already voted", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

const deleteRoute = createRoute({
  method: "delete",
  path: "/:id",
  tags: ["Votes"],
  summary: "Delete a vote",
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: "Deleted", content: { "application/json": { schema: z.object({ success: z.literal(true) }) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    ...errorResponses,
  },
});

export const votesRouter = new OpenAPIHono<Env>()
  .use(apiKeyMiddleware)
  .openapi(listRoute, async (c) => {
    const result = await listVotes(getDb(c), c.get("organizationId"), c.req.valid("query"));
    return c.json(result as never, 200);
  })
  .openapi(createRoute_, async (c) => {
    const result = await createVote(getDb(c), c.get("organizationId"), c.req.valid("json"));
    if ("error" in result) {
      if (result.error === "already_voted") return c.json(apiError("already_voted").body, 409);
      if (result.error === "user_not_found") return c.json(apiError("user_not_found").body, 404);
      return c.json(apiError("post_not_found").body, 404);
    }
    return c.json(result as never, 201);
  })
  .openapi(deleteRoute, async (c) => {
    const deleted = await deleteVote(getDb(c), c.get("organizationId"), c.req.valid("param").id);
    if (!deleted) return c.json(apiError("not_found").body, 404);
    return c.json({ success: true as const }, 200);
  });

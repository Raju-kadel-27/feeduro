import { z } from "zod";

export const CannyUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  // Canny users may not have a public email if they signed up via OAuth
  email: z.string().nullable().optional(),
  created: z.string(),
});
export type CannyUser = z.infer<typeof CannyUserSchema>;

export const CannyBoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  postCount: z.number(),
});
export type CannyBoard = z.infer<typeof CannyBoardSchema>;

export const CannyPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  details: z.string().nullable().optional(),
  status: z.string(),
  score: z.number(),
  author: CannyUserSchema,
  created: z.string(),
  board: z.object({ id: z.string(), name: z.string() }),
  category: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
});
export type CannyPost = z.infer<typeof CannyPostSchema>;

export const CannyVoteSchema = z.object({
  id: z.string(),
  postID: z.string(),
  voter: CannyUserSchema,
  created: z.string(),
});
export type CannyVote = z.infer<typeof CannyVoteSchema>;

export const CannyCommentSchema = z.object({
  id: z.string(),
  postID: z.string(),
  author: CannyUserSchema,
  value: z.string(),
  created: z.string(),
  parentID: z.string().nullable().optional(),
});
export type CannyComment = z.infer<typeof CannyCommentSchema>;

// Paginated list response wrappers
export const CannyBoardListSchema = z.object({ boards: z.array(CannyBoardSchema) });
export const CannyPostListSchema = z.object({
  posts: z.array(CannyPostSchema),
  hasMore: z.boolean(),
});
export const CannyVoteListSchema = z.object({
  votes: z.array(CannyVoteSchema),
  hasMore: z.boolean(),
});
export const CannyCommentListSchema = z.object({
  comments: z.array(CannyCommentSchema),
  hasMore: z.boolean(),
});

import { generateText } from "@services/groq/client";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { comments, feedbackPosts, user } from "@/db/schema";

function buildPrompt(params: {
  title: string;
  description: string | null;
  voteCount: number;
  commentBodies: { author: string; body: string }[];
}): string {
  const { title, description, voteCount, commentBodies } = params;

  const commentBlock =
    commentBodies.length > 0
      ? commentBodies.map((c) => `${c.author}: ${c.body}`).join("\n")
      : "No comments yet.";

  return `You are a product manager reading through user feedback. Summarize what users are asking for in plain, conversational English — like you're quickly explaining it to a colleague over Slack.

Post: ${title}
${description ? `Description: ${description}` : ""}
Votes: ${voteCount}

Comments:
${commentBlock}

Write 2–4 sentences. Be direct and human — no corporate language, no "users are requesting", no bullet points, no markdown. Just say what people want and why it matters to them.`;
}

export async function generateCommentSummary(
  postId: string,
  organizationId: string,
  apiKey: string,
): Promise<string> {
  const db = getDb();

  const [post, commentRows] = await Promise.all([
    db.query.feedbackPosts.findFirst({
      where: and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)),
      columns: { id: true, title: true, description: true, voteCount: true },
    }),
    db
      .select({ body: comments.body, userId: comments.userId })
      .from(comments)
      .where(and(eq(comments.postId, postId), eq(comments.organizationId, organizationId)))
      .orderBy(asc(comments.createdAt))
      .limit(100),
  ]);

  if (!post) throw new Error("Post not found");

  const userIds = [...new Set(commentRows.map((c) => c.userId))];
  const userRows =
    userIds.length > 0
      ? await db
          .select({ id: user.id, name: user.name, email: user.email })
          .from(user)
          .where(inArray(user.id, userIds))
      : [];

  const userMap = new Map(userRows.map((u) => [u.id, u.name ?? u.email ?? "User"]));

  const commentBodies = commentRows.map((c) => ({
    author: userMap.get(c.userId) ?? "User",
    body: c.body,
  }));

  const summary = await generateText(
    buildPrompt({ title: post.title, description: post.description, voteCount: post.voteCount, commentBodies }),
    apiKey,
  );

  await db
    .update(feedbackPosts)
    .set({ aiSummary: summary, aiSummaryGeneratedAt: new Date() })
    .where(and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)));

  return summary;
}

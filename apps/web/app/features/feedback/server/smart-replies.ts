import { createId } from "@paralleldrive/cuid2";
import { generateText } from "@services/groq/client";
import { and, asc, eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { comments, feedbackBoards, member, organization, user } from "@/db/schema";

type Db = ReturnType<typeof getDb>;

interface PostContext {
  id: string;
  title: string;
  description: string | null;
  boardId: string;
  organizationId: string;
}

function buildPrompt(params: {
  orgName: string;
  postTitle: string;
  postDescription: string | null;
  customInstructions: string | null;
}): string {
  const { orgName, postTitle, postDescription, customInstructions } = params;

  if (customInstructions?.trim()) {
    return `You are an AI assistant for ${orgName}, responding to user feedback.

Post title: ${postTitle}
${postDescription ? `Post description: ${postDescription}` : ""}

Instructions:
${customInstructions}

Write a reply to this feedback post.`;
  }

  return `You are a sharp, empathetic product person at ${orgName}. A user just submitted feedback — respond like a teammate who genuinely wants to understand the problem, not a support bot closing a ticket.

Feedback:
Title: ${postTitle}
${postDescription ? `Description: ${postDescription}` : ""}

How to respond:
- Start with a brief, genuine thanks (one short phrase, not a sentence — e.g. "Thanks for this." or "Appreciate you raising it.").
- Get straight to the point. Don't paraphrase what they said back to them.
- If anything is unclear or lacks context, ask exactly ONE question — make it incisive. Good questions probe: what workflow were they in, how often does this happen, what did they expect instead, or what's the impact on them. Bad questions ask about features or implementation.
- If the feedback is already specific and actionable, skip the question. Briefly acknowledge it's on the radar or confirm the next step if obvious.
- Total reply: 2–3 sentences. Direct. Human. No filler.

Reply (plain text only, no markdown):`;
}

export async function triggerSmartReply(db: Db, post: PostContext, apiKey: string): Promise<void> {
  const board = await db.query.feedbackBoards.findFirst({
    where: and(
      eq(feedbackBoards.id, post.boardId),
      eq(feedbackBoards.organizationId, post.organizationId),
    ),
    columns: {
      smartRepliesEnabled: true,
      smartRepliesInstructions: true,
    },
  });

  if (!board?.smartRepliesEnabled) return;

  const [org, firstAdmin] = await Promise.all([
    db.query.organization.findFirst({
      where: eq(organization.id, post.organizationId),
      columns: { name: true },
    }),
    db
      .select({ userId: member.userId })
      .from(member)
      .where(and(eq(member.organizationId, post.organizationId), eq(member.role, "admin")))
      .orderBy(asc(member.createdAt))
      .limit(1),
  ]);

  if (!firstAdmin[0]) return;

  const adminUser = await db.query.user.findFirst({
    where: eq(user.id, firstAdmin[0].userId),
    columns: { id: true },
  });

  if (!adminUser) return;

  const prompt = buildPrompt({
    orgName: org?.name ?? "our team",
    postTitle: post.title,
    postDescription: post.description,
    customInstructions: board.smartRepliesInstructions ?? null,
  });

  const replyText = await generateText(prompt, apiKey);
  if (!replyText) return;

  await db.insert(comments).values({
    id: createId(),
    postId: post.id,
    organizationId: post.organizationId,
    userId: adminUser.id,
    parentId: null,
    body: replyText,
    isInternal: false,
    isAiGenerated: true,
  });
}

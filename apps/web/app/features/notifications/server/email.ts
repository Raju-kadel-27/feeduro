import { sendEmail } from "@lib/mailer";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { feedbackPosts, user } from "@/db/schema";

export async function notifyCustomerReplyByEmail({
  postId,
  organizationId,
  actorId,
  actorName,
  commentBody,
}: {
  postId: string;
  organizationId: string;
  actorId: string;
  actorName: string;
  commentBody: string;
}): Promise<void> {
  const db = getDb();

  const row = await db
    .select({
      createdBy: feedbackPosts.createdBy,
      submitterEmail: feedbackPosts.submitterEmail,
      postTitle: feedbackPosts.title,
      authorEmail: user.email,
      authorName: user.name,
    })
    .from(feedbackPosts)
    .leftJoin(user, eq(feedbackPosts.createdBy, user.id))
    .where(and(eq(feedbackPosts.id, postId), eq(feedbackPosts.organizationId, organizationId)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!row) return;
  // Skip if the actor IS the post author (avoid replying to yourself)
  if (row.createdBy && row.createdBy === actorId) return;
  // Prefer auth'd user email; fall back to widget submitter email for anonymous posts
  const recipientEmail = row.authorEmail ?? row.submitterEmail;
  if (!recipientEmail) return;

  const preview = commentBody.length > 300 ? `${commentBody.slice(0, 300)}…` : commentBody;
  const html = `
<p>Hi ${row.authorName ?? "there"},</p>
<p>${actorName} replied to your feedback: <strong>${row.postTitle}</strong></p>
<blockquote style="border-left:3px solid #d1d5db;padding-left:12px;margin:12px 0;color:#6b7280">
  ${preview.replace(/\n/g, "<br>")}
</blockquote>
<p>— The Support Team</p>
`.trim();

  await sendEmail({ to: recipientEmail, subject: `Re: ${row.postTitle}`, html });
}

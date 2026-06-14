import { getDb } from "@/db";
import { votes } from "@/db/schema";
import type { CannyVote } from "../schemas/canny";

const BATCH = 100;

// Insert votes attributing each to a userProfile.
// Skips votes whose post or voter email cannot be resolved.
// ON CONFLICT DO NOTHING targets profile_vote_unique_idx (postId, userProfileId).
// Returns count of newly inserted rows.
export async function insertVotes(
  organizationId: string,
  cannyVotes: CannyVote[],
  postMap: Map<string, string>,
  profileMap: Map<string, string>,
): Promise<number> {
  const values = cannyVotes
    .filter(
      (v) =>
        postMap.has(v.postID) &&
        v.voter.email &&
        profileMap.has(v.voter.email),
    )
    .map((v) => ({
      organizationId,
      postId: postMap.get(v.postID) as string,
      userProfileId: profileMap.get(v.voter.email as string) as string,
      createdAt: new Date(v.created),
    }));

  if (values.length === 0) return 0;
  const db = getDb();

  let inserted = 0;
  for (let i = 0; i < values.length; i += BATCH) {
    const result = await db
      .insert(votes)
      .values(values.slice(i, i + BATCH))
      .onConflictDoNothing()
      .returning({ id: votes.id });
    inserted += result.length;
  }
  return inserted;
}

import { bulkUpsertUserProfiles } from "@features/internal/segmentation/server/mutations";
import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { userProfiles } from "@/db/schema";
import type { CannyComment, CannyPost, CannyVote } from "../schemas/canny";
import { syncBoards } from "./board-sync";
import { collectUniqueUsers, toIdentifyInput } from "./canny-adapter";
import {
  fetchBoards,
  fetchCommentsByBoard,
  fetchPostsByBoard,
  fetchVotesByBoard,
} from "./canny-client";
import { insertComments } from "./comment-ingestion";
import { completeImportJob, createImportJob, failImportJob } from "./job-service";
import { insertPosts, reconcileVoteCounts } from "./post-ingestion";
import { insertVotes } from "./vote-ingestion";

export interface CannyImportResult {
  jobId: string;
  imported: {
    boards: number;
    profiles: number;
    posts: number;
    votes: number;
    comments: number;
  };
}

export async function runCannyImport(
  db: Db,
  organizationId: string,
  apiKey: string,
  createdBy: string,
): Promise<CannyImportResult> {
  const jobId = await createImportJob(db, organizationId, "canny", createdBy);

  try {
    // 1. Fetch boards once; posts/votes/comments fetched per-board sequentially
    //    to avoid hammering Canny's rate limit
    const cannyBoards = await fetchBoards(apiKey);

    const allPosts: CannyPost[] = [];
    const allVotes: CannyVote[] = [];
    const allComments: CannyComment[] = [];

    for (const board of cannyBoards) {
      const [posts, boardVotes, boardComments] = await Promise.all([
        fetchPostsByBoard(apiKey, board.id),
        fetchVotesByBoard(apiKey, board.id),
        fetchCommentsByBoard(apiKey, board.id),
      ]);
      allPosts.push(...posts);
      allVotes.push(...boardVotes);
      allComments.push(...boardComments);
    }

    // 2. Resolve / create our boards
    const boardMap = await syncBoards(db, organizationId, cannyBoards, createdBy);

    // 3. Upsert all unique users (with email) into userProfiles
    const uniqueUsers = collectUniqueUsers(allPosts, allVotes, allComments);
    const usersWithEmail = uniqueUsers.filter((u) => u.email);
    await bulkUpsertUserProfiles(db, organizationId, usersWithEmail.map(toIdentifyInput));

    // Build email → profileId map for vote and comment attribution
    const profileRows = await db
      .select({ id: userProfiles.id, email: userProfiles.email })
      .from(userProfiles)
      .where(
        and(
          eq(userProfiles.organizationId, organizationId),
          inArray(
            userProfiles.email,
            usersWithEmail.map((u) => u.email as string),
          ),
        ),
      );
    const profileMap = new Map(profileRows.map((r) => [r.email, r.id]));

    // 4. Insert posts → get cannyPostId → ourPostId map
    const postMap = await insertPosts(db, organizationId, jobId, allPosts, boardMap);

    // 5. Insert votes (skip voters without email or unresolved posts)
    const votesInserted = await insertVotes(db, organizationId, allVotes, postMap, profileMap);

    // 6. Insert comments (two-pass: top-level then replies)
    const commentsInserted = await insertComments(
      db,
      organizationId,
      allComments,
      postMap,
      profileMap,
    );

    // 7. Reconcile cached voteCount — actual DB row count overwrites Canny's score
    await reconcileVoteCounts(db, [...postMap.values()]);

    const total = allPosts.length + allVotes.length + allComments.length;
    const imported = postMap.size + votesInserted + commentsInserted;
    await completeImportJob(db, jobId, { total, imported, failed: total - imported });

    return {
      jobId,
      imported: {
        boards: boardMap.size,
        profiles: usersWithEmail.length,
        posts: postMap.size,
        votes: votesInserted,
        comments: commentsInserted,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[import] Canny import failed:", msg);
    await failImportJob(db, jobId, msg);
    throw err;
  }
}

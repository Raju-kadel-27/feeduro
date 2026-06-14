import type { IdentifyUserInput } from "@features/internal/segmentation/schemas/identify";
import type { CannyComment, CannyPost, CannyUser, CannyVote } from "../schemas/canny";

const STATUS_MAP: Record<string, string> = {
  open: "open",
  "under review": "reviewing",
  planned: "planned",
  "in progress": "in-progress",
  complete: "completed",
  completed: "completed",
  closed: "closed",
  private: "closed",
};

export function mapCannyStatus(cannyStatus: string): string {
  return STATUS_MAP[cannyStatus.toLowerCase()] ?? "open";
}

export function slugifyBoardName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 255) || "board";
}

// Collect all unique users across posts, votes, and comments that have an email.
// Canny users without email (OAuth-only) cannot be matched to a userProfile and are skipped.
export function collectUniqueUsers(
  posts: CannyPost[],
  votes: CannyVote[],
  comments: CannyComment[],
): CannyUser[] {
  const seen = new Map<string, CannyUser>();
  const add = (u: CannyUser) => {
    if (u.email && !seen.has(u.email)) seen.set(u.email, u);
  };
  for (const p of posts) add(p.author);
  for (const v of votes) add(v.voter);
  for (const c of comments) add(c.author);
  return [...seen.values()];
}

export function toIdentifyInput(u: CannyUser): IdentifyUserInput {
  return {
    email: u.email as string, // callers must pre-filter for users with email
    externalId: u.id,
    name: u.name,
    traits: {},
  };
}

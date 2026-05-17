export type Status = "open" | "reviewing" | "planned" | "in-progress" | "completed" | "closed";
export type Groups = Record<Status, string[]>;

export interface Post {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  createdAt: Date;
  voteCount: number;
  hasVoted: boolean;
  commentCount: number;
  githubIssueNumber: number | null;
  githubIssueUrl: string | null;
  boardName?: string | null;
  authorName?: string | null;
  authorImage?: string | null;
}

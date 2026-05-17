import type { StatusKey } from "./constants";

export interface WidgetPost {
  id: string;
  title: string;
  status: StatusKey;
  voteCount: number;
  commentCount: number;
}

export interface IdentityPayload {
  id: string;
  email?: string;
  name?: string;
  signature?: string;
}

export interface WidgetLoaderData {
  token: string;
  org: { name: string; slug: string };
  board: { id: string; name: string } | null;
  posts: WidgetPost[];
  theme: string;
}
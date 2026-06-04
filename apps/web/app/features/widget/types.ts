import type { StatusKey } from "./constants";

export type WidgetSettingsBoard = {
  id: string;
  name: string;
  isDefault: boolean;
  embedToken: string;
};

export type WidgetSettingsConfig = {
  id: string;
  token: string;
  enabled: boolean;
  boardId: string | null;
  position: "left" | "right";
  theme: "light" | "dark" | "auto";
  allowedOrigins: string | null;
};

export type WidgetSettingsLoaderData = {
  orgSlug: string;
  config: WidgetSettingsConfig;
  boards: WidgetSettingsBoard[];
};

export type WidgetMode = "popup" | "inline";

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
  board: { id: string; name: string; description: string | null } | null;
  posts: WidgetPost[];
  theme: string;
  mode: WidgetMode;
}

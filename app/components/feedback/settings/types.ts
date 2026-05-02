export type BoardColor = "green" | "red" | "blue" | "amber";

export const BOARD_COLORS: BoardColor[] = ["green", "red", "blue", "amber"];

export interface FeedbackBoard {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: "public" | "private";
  isDefault: boolean;
  postCount: number;
  color: BoardColor;
}

export interface FeedbackTag {
  id: string;
  name: string;
}

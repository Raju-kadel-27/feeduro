export type SuggestionType = "duplicate" | "spam";
export type SuggestionStatus = "pending" | "approved" | "dismissed" | "auto_actioned";
export type Confidence = "low" | "medium" | "high";

export interface AutopilotSuggestion {
  id: string;
  organizationId: string;
  type: SuggestionType;
  status: SuggestionStatus;
  sourcePostId: string;
  targetPostId: string | null;
  confidence: Confidence;
  reason: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  createdAt: string;
}

export interface SuggestionWithPosts extends AutopilotSuggestion {
  sourcePost: { id: string; title: string; description: string | null; boardName: string };
  targetPost: { id: string; title: string } | null;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  matchedPostId: string | null;
  confidence: Confidence;
  reason: string;
}

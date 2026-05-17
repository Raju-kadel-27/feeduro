export interface FeedbackSettingsMeta {
  enableRoadmap: boolean;
  weeklyDigest: boolean;
}

const DEFAULTS: FeedbackSettingsMeta = {
  enableRoadmap: false,
  weeklyDigest: false,
};

export function parseFeedbackSettings(metadata: string | null): FeedbackSettingsMeta {
  if (!metadata) return DEFAULTS;
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    return { ...DEFAULTS, ...((parsed.feedbackSettings as Partial<FeedbackSettingsMeta>) ?? {}) };
  } catch {
    return DEFAULTS;
  }
}

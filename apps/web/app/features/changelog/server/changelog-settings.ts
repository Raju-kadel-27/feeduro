export const DEFAULT_TAGS = [
  "bug fix",
  "documentation",
  "new feature",
  "security update",
  "announcement",
];

export interface ChangelogSettings {
  enabled: boolean;
  emailSubscriptionsEnabled: boolean;
}

const DEFAULTS: ChangelogSettings = { enabled: true, emailSubscriptionsEnabled: false };

export function parseChangelogSettings(metadata: string | null): ChangelogSettings {
  if (!metadata) return DEFAULTS;
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    return { ...DEFAULTS, ...((parsed.changelogSettings as Partial<ChangelogSettings>) ?? {}) };
  } catch {
    return DEFAULTS;
  }
}

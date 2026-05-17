export const DEFAULT_TAGS = ["bug fix", "documentation", "new feature", "security update", "announcement"];

export interface ChangelogSettings {
  enabled: boolean;
}

const DEFAULTS: ChangelogSettings = { enabled: true };

export function parseChangelogSettings(metadata: string | null): ChangelogSettings {
  if (!metadata) return DEFAULTS;
  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    return { ...DEFAULTS, ...((parsed.changelogSettings as Partial<ChangelogSettings>) ?? {}) };
  } catch {
    return DEFAULTS;
  }
}

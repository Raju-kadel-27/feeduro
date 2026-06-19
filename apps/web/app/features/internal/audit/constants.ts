export const AUDIT_PAGE_SIZE = 25;

export const AUDIT_CATEGORIES: Record<string, string[]> = {
  membership: ["member_invited", "invitation_cancelled", "member_removed"],
  api_keys: ["api_key_created", "api_key_deleted"],
  sso: ["sso_configured", "sso_deleted"],
  widget: ["widget_secret_rotated", "widget_token_regenerated"],
};

export type AuditCategory = "membership" | "api_keys" | "sso" | "widget";

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  membership: "Membership",
  api_keys: "API Keys",
  sso: "SSO",
  widget: "Widget",
};

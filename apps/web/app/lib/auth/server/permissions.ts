import { createAccessControl } from "better-auth/plugins/access";

export const ac = createAccessControl({
  // Built-in better-auth org resources (required for core org features)
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  ac: ["create", "read", "update", "delete"],
  // Feeduro app resources — feedback & content
  feedback: ["create", "read", "update", "delete", "respond", "change-status"],
  board: ["create", "read", "update", "delete"],
  changelog: ["create", "read", "update", "delete", "publish"],
  // Feeduro app resources — settings (split into focused sub-domains)
  settings: ["read", "update"],          // workspace name, slug, privacy
  branding: ["read", "update"],          // logo, colors, theme, portal appearance
  integrations: ["read", "update"],      // all third-party connectors
  security: ["read", "update"],          // SSO, API keys, custom domain
});

export const adminRole = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  ac: ["create", "read", "update", "delete"],
  feedback: ["create", "read", "update", "delete", "respond", "change-status"],
  board: ["create", "read", "update", "delete"],
  changelog: ["create", "read", "update", "delete", "publish"],
  settings: ["read", "update"],
  branding: ["read", "update"],
  integrations: ["read", "update"],
  security: ["read", "update"],
});

export const memberRole = ac.newRole({
  feedback: ["create", "read", "update", "respond", "change-status"],
  board: ["read"],
  changelog: ["create", "read", "update"],
  settings: ["read"],
  branding: ["read"],
});

export const viewerRole = ac.newRole({
  feedback: ["read"],
  board: ["read"],
  changelog: ["read"],
});

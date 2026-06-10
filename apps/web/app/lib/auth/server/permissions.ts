import { createAccessControl } from "better-auth/plugins/access";

export const ac = createAccessControl({
  // Built-in better-auth org resources (required for core org features)
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  ac: ["create", "read", "update", "delete"],
  // Feeduro app resources
  feedback: ["create", "read", "update", "delete", "respond", "change-status"],
  board: ["create", "read", "update", "delete"],
  changelog: ["create", "read", "update", "delete", "publish"],
  settings: ["read", "update"],
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
});

export const memberRole = ac.newRole({
  invitation: ["create", "cancel"],
  feedback: ["create", "read", "update"],
  board: ["read"],
  changelog: ["read"],
  settings: ["read"],
});

export const viewerRole = ac.newRole({
  feedback: ["read"],
  board: ["read"],
  changelog: ["read"],
});

import type { ResourceKey } from "./types";

export const RESOURCE_DEFINITIONS: {
  key: ResourceKey;
  label: string;
  permissions: { value: string; label: string }[];
}[] = [
  {
    key: "feedback",
    label: "Feedback",
    permissions: [
      { value: "read", label: "View" },
      { value: "create", label: "Create" },
      { value: "update", label: "Edit" },
      { value: "delete", label: "Delete" },
      { value: "respond", label: "Respond" },
      { value: "change-status", label: "Change Status" },
    ],
  },
  {
    key: "board",
    label: "Boards",
    permissions: [
      { value: "read", label: "View" },
      { value: "create", label: "Create" },
      { value: "update", label: "Edit" },
      { value: "delete", label: "Delete" },
    ],
  },
  {
    key: "changelog",
    label: "Changelog",
    permissions: [
      { value: "read", label: "View" },
      { value: "create", label: "Create" },
      { value: "update", label: "Edit" },
      { value: "delete", label: "Delete" },
      { value: "publish", label: "Publish" },
    ],
  },
  {
    key: "member",
    label: "Members",
    permissions: [
      { value: "create", label: "Invite" },
      { value: "update", label: "Change Role" },
      { value: "delete", label: "Remove" },
    ],
  },
  {
    key: "invitation",
    label: "Invitations",
    permissions: [
      { value: "create", label: "Send" },
      { value: "cancel", label: "Cancel" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    permissions: [
      { value: "read", label: "View" },
      { value: "update", label: "Update" },
    ],
  },
];

export interface OrgRole {
  id: string;
  /** The role name — better-auth calls this field `role` */
  role: string;
  organizationId: string;
  /** Better-auth stores/returns permissions as `permission` (singular), parsed to object */
  permission: Record<string, string[]>;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export type ResourceKey =
  | "feedback"
  | "board"
  | "changelog"
  | "settings"
  | "member"
  | "invitation";

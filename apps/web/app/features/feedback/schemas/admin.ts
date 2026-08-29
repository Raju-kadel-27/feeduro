import { z } from "zod";

export const AdminStatusSchema = z.enum([
  "open",
  "reviewing",
  "planned",
  "in-progress",
  "completed",
  "closed",
]);
export type AdminStatus = z.infer<typeof AdminStatusSchema>;

export const ReplyDataSchema = z.object({
  id: z.string(),
  body: z.string(),
  isInternal: z.boolean(),
  parentId: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
  userImage: z.string().nullable(),
});
export type ReplyData = z.infer<typeof ReplyDataSchema>;

export const CommentDataSchema = z.object({
  id: z.string(),
  body: z.string(),
  isInternal: z.boolean(),
  isPinned: z.boolean().default(false),
  pinnedAt: z.string().nullable().default(null),
  parentId: z.string().nullable(),
  userId: z.string(),
  createdAt: z.string(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
  userImage: z.string().nullable(),
  replies: z.array(ReplyDataSchema),
});
export type CommentData = z.infer<typeof CommentDataSchema>;

export const ActivityDataSchema = z.object({
  id: z.string(),
  type: z.string(),
  oldValue: z.string().nullable(),
  newValue: z.string(),
  userId: z.string().nullable(),
  createdAt: z.string(),
  userName: z.string().nullable(),
  userImage: z.string().nullable(),
});
export type ActivityData = z.infer<typeof ActivityDataSchema>;

export const IntegrationLinkSchema = z.object({
  identifier: z.string().nullable(),
  externalTitle: z.string().nullable(),
  externalStatus: z.string().nullable(),
  externalUrl: z.string().nullable(),
});
export type IntegrationLink = z.infer<typeof IntegrationLinkSchema>;

export const OrgMemberSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});
export type OrgMember = z.infer<typeof OrgMemberSchema>;

export const PostDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  boardId: z.string(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  mergedIntoPostId: z.string().nullable(),
  voteCount: z.number(),
  hasVoted: z.boolean(),
  reactionCounts: z.record(z.number()),
  myReactions: z.array(z.string()),
  authorName: z.string(),
  authorImage: z.string().nullable(),
  aiSummary: z.string().nullable(),
  aiSummaryGeneratedAt: z.string().nullable(),
  ownerId: z.string().nullable(),
  ownerName: z.string().nullable(),
  ownerImage: z.string().nullable(),
  submitterEmail: z.string().nullable(),
});
export type PostDetail = z.infer<typeof PostDetailSchema>;
export const DetailDataSchema = z.object({
  postDetail: PostDetailSchema,
  board: z.object({ name: z.string(), slug: z.string(), visibility: z.string() }),
  currentRole: z.string(),
  linearLink: IntegrationLinkSchema.nullable(),
  linearConnected: z.boolean(),
  jiraLink: IntegrationLinkSchema.nullable(),
  jiraConnected: z.boolean(),
  asanaLink: IntegrationLinkSchema.nullable(),
  asanaConnected: z.boolean(),
  githubLink: IntegrationLinkSchema.nullable(),
  githubConnected: z.boolean(),
  clickupLink: IntegrationLinkSchema.nullable(),
  clickupConnected: z.boolean(),
  shortcutLink: IntegrationLinkSchema.nullable(),
  shortcutConnected: z.boolean(),
  notionLink: IntegrationLinkSchema.nullable(),
  notionConnected: z.boolean(),
  trelloLink: IntegrationLinkSchema.nullable(),
  trelloConnected: z.boolean(),
  mondayLink: IntegrationLinkSchema.nullable(),
  mondayConnected: z.boolean(),
  zendeskLink: IntegrationLinkSchema.nullable(),
  zendeskConnected: z.boolean(),
  hubspotLink: IntegrationLinkSchema.nullable(),
  hubspotConnected: z.boolean(),
  salesforceLink: IntegrationLinkSchema.nullable(),
  salesforceConnected: z.boolean(),
  mergedIntoPost: z.object({ id: z.string(), title: z.string() }).nullable(),
  mergedChildren: z.array(z.object({ id: z.string(), title: z.string(), createdAt: z.string() })),
  canUnmerge: z.boolean(),
  orgAdmins: z.array(OrgMemberSchema),
});
export type DetailData = z.infer<typeof DetailDataSchema>;

export const CommentsResponseSchema = z.object({
  comments: z.array(CommentDataSchema),
});

export const ActivitiesResponseSchema = z.object({
  activities: z.array(ActivityDataSchema),
});

export const MergeSearchResponseSchema = z.object({
  posts: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
      voteCount: z.number(),
    }),
  ),
});
export type MergeSearchPost = z.infer<typeof MergeSearchResponseSchema>["posts"][number];

export const LinearIssueResultSchema = z.object({
  identifier: z.string(),
  title: z.string(),
  url: z.string(),
  state: z.object({ name: z.string() }),
});

export const JiraIssueResultSchema = z.object({
  id: z.string(),
  key: z.string(),
  url: z.string(),
  summary: z.string(),
  statusName: z.string(),
});

export const AsanaTaskResultSchema = z.object({
  gid: z.string(),
  name: z.string(),
  url: z.string(),
  sectionGid: z.string().nullable(),
  sectionName: z.string().nullable(),
  completed: z.boolean(),
});

export const GithubIssueResultSchema = z.object({
  number: z.number(),
  html_url: z.string(),
  title: z.string(),
  state: z.string(),
});

export const ClickupTaskResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  custom_id: z.string().nullable().optional(),
  status: z.object({ status: z.string() }),
});

export const ShortcutStoryResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  app_url: z.string(),
});

export const NotionPageResultSchema = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
});

export const TrelloCardResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  listName: z.string().nullable().optional(),
});

export const MondayItemResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  groupTitle: z.string().nullable(),
  state: z.string(),
});

export const ZendeskTicketResultSchema = z.object({
  id: z.number(),
  subject: z.string(),
  status: z.string(),
  url: z.string(),
});

export const HubSpotDealResultSchema = z.object({
  id: z.string(),
  dealname: z.string(),
  dealstage: z.string(),
  dealUrl: z.string(),
});

export const SalesforceOpportunityResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  stageName: z.string(),
  opportunityUrl: z.string(),
});

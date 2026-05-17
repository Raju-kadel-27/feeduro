import { getOrgTags, getPostTags } from "@features/feedback/server/tags.server";
import {
  getVoterProfilesByPost,
  getVoterTraitCountsByPost,
} from "@features/segmentation/server/service";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  ExternalLink,
  GitMerge,
  Heart,
  Lock,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Share2,
  Smile,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useRevalidator } from "react-router";
import { toast } from "sonner";
import { getDb } from "@/db";
import {
  comments,
  feedbackBoards,
  feedbackPosts,
  integrations,
  member,
  postActivities,
  postExternalLinks,
  reactions,
  user,
  votes,
} from "@/db/schema";

import type { VoterProfileRow } from "@features/segmentation/server/service";
import type { VoterTraitCounts } from "@features/segmentation/types";
import type { Route } from "./+types/$postId";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "open" | "reviewing" | "planned" | "in-progress" | "completed" | "closed";
type ReactionType = "heart";

interface CommentData {
  id: string;
  body: string;
  isInternal: boolean;
  isAiGenerated: boolean;
  parentId: string | null;
  userId: string;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  replies: ReplyData[];
}

interface ReplyData {
  id: string;
  body: string;
  isInternal: boolean;
  isAiGenerated: boolean;
  parentId: string;
  userId: string;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
}

interface ActivityData {
  id: string;
  type: string;
  oldValue: string | null;
  newValue: string;
  userId: string;
  createdAt: string;
  userName: string | null;
  userImage: string | null;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Status,
  { label: string; dotColor: string; textColor: string; bgColor: string }
> = {
  open: {
    label: "Pending",
    dotColor: "#94a3b8",
    textColor: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
  },
  reviewing: {
    label: "Reviewing",
    dotColor: "#f97316",
    textColor: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950",
  },
  planned: {
    label: "Planned",
    dotColor: "#eab308",
    textColor: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950",
  },
  "in-progress": {
    label: "In Progress",
    dotColor: "#8b5cf6",
    textColor: "text-violet-700 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-950",
  },
  completed: {
    label: "Completed",
    dotColor: "#22c55e",
    textColor: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950",
  },
  closed: {
    label: "Closed",
    dotColor: "#f87171",
    textColor: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950",
  },
};

const STATUS_NEXT: Partial<Record<Status, Status>> = {
  open: "reviewing",
  reviewing: "planned",
  planned: "in-progress",
  "in-progress": "completed",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusCircleIcon({ status, size = 18 }: { status: Status; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  if (status === "completed") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle cx={cx} cy={cy} r={r} fill="#22c55e" />
        <polyline
          points={`${size * 0.3},${cy} ${size * 0.46},${size * 0.65} ${size * 0.72},${size * 0.37}`}
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "closed") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle cx={cx} cy={cy} r={r} stroke="#f87171" strokeWidth="1.5" />
        <line
          x1={size * 0.35}
          y1={size * 0.35}
          x2={size * 0.65}
          y2={size * 0.65}
          stroke="#f87171"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1={size * 0.65}
          y1={size * 0.35}
          x2={size * 0.35}
          y2={size * 0.65}
          stroke="#f87171"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (status === "in-progress") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle cx={cx} cy={cy} r={r} stroke="#8b5cf6" strokeWidth="1.5" />
        <path d={`M${cx},${cy - r} A${r},${r} 0 0,1 ${cx},${cy + r} Z`} fill="#8b5cf6" />
      </svg>
    );
  }
  if (status === "reviewing") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle cx={cx} cy={cy} r={r} stroke="#f97316" strokeWidth="1.5" />
        <path d={`M${cx},${cy - r} A${r},${r} 0 0,1 ${cx},${cy + r} Z`} fill="#f97316" />
      </svg>
    );
  }
  if (status === "planned") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <circle cx={cx} cy={cy} r={r} stroke="#eab308" strokeWidth="1.5" strokeDasharray="3.5 2" />
        <circle cx={cx} cy={cy} r={size * 0.14} fill="#eab308" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={cx} cy={cy} r={r} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3.5 2" />
    </svg>
  );
}

function Avatar({
  name,
  image,
  size = 28,
}: {
  name: string | null;
  image?: string | null;
  size?: number;
}) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (image) {
    return (
      <img
        src={image}
        alt={name ?? ""}
        style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0"
    >
      {initials}
    </div>
  );
}

function ToolbarBtn({
  icon,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {icon}
    </button>
  );
}

function LinearIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#5E6AD2" />
      <path d="M7 17L17 7M7 12.5L12.5 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function JiraIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path
        d="M15.975 0C12.146 7.935 13.18 5.828 7.81 16.434l8.165 8.165L31.95 8.634C31.95 8.634 19.804 13.811 15.975 0Z"
        fill="#2684FF"
      />
      <path
        d="M15.975 32c3.83-7.935 2.795-5.828 8.165-16.434l-8.165-8.165L0 23.366C0 23.366 12.146 18.189 15.975 32Z"
        fill="#2684FF"
      />
    </svg>
  );
}

function AsanaIcon({ size = 14 }: { size?: number }) {
  const r = size * 0.19;
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={cx} cy={size * 0.38} r={r} fill="#F06A6A" />
      <circle cx={size * 0.3} cy={size * 0.65} r={r} fill="#F06A6A" />
      <circle cx={size * 0.7} cy={size * 0.65} r={r} fill="#F06A6A" />
    </svg>
  );
}

function ShortcutIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill="#6515DD" />
      <path
        d="M9 11.5C9 10.12 10.12 9 11.5 9H17a4.5 4.5 0 0 1 0 9h-1.5l3.5 5H16l-3.5-5H11.5A2.5 2.5 0 0 1 9 15.5v-4ZM11.5 11a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5H17a2.5 2.5 0 0 0 0-5h-5.5Z"
        fill="white"
      />
    </svg>
  );
}

// ─── VoterInsights ────────────────────────────────────────────────────────────

const TRAIT_DIMENSIONS: { key: keyof VoterTraitCounts; label: string }[] = [
  { key: "plan", label: "Plan" },
  { key: "role", label: "Role" },
  { key: "industry", label: "Industry" },
  { key: "location", label: "Location" },
];

function VoterInsights({
  voteCount,
  traitCounts,
  profiles,
  orgSlug,
}: {
  voteCount: number;
  traitCounts: VoterTraitCounts;
  profiles: VoterProfileRow[];
  orgSlug: string;
}) {
  const hasTraitData = TRAIT_DIMENSIONS.some(
    ({ key }) => Object.keys(traitCounts[key]).length > 0,
  );

  return (
    <div className="border-t pt-4 space-y-3">
      <p className="text-xs font-medium">
        Voters{" "}
        <span className="text-muted-foreground font-normal">({voteCount})</span>
      </p>

      {voteCount === 0 ? (
        <p className="text-xs text-muted-foreground">No votes yet.</p>
      ) : !hasTraitData ? (
        <p className="text-xs text-muted-foreground leading-relaxed">
          No profiled voters yet.{" "}
          <Link
            to={`/${orgSlug}/settings/segments`}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Identify users via API
          </Link>{" "}
          to see voter insights.
        </p>
      ) : (
        <div className="space-y-3">
          {TRAIT_DIMENSIONS.map(({ key, label }) => {
            const entries = Object.entries(traitCounts[key])
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5);
            if (entries.length === 0) return null;
            const max = entries[0][1];
            return (
              <div key={key}>
                <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1.5">
                  {label}
                </p>
                <div className="space-y-1">
                  {entries.map(([val, cnt]) => (
                    <div key={val} className="flex items-center gap-2">
                      <span className="text-[11px] text-foreground/70 w-16 shrink-0 truncate capitalize">
                        {val}
                      </span>
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-400 rounded-full transition-all"
                          style={{ width: `${(cnt / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] tabular-nums text-muted-foreground shrink-0 w-4 text-right">
                        {cnt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {profiles.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1.5">
                Recent voters
              </p>
              <div className="space-y-1.5">
                {profiles.slice(0, 8).map((p) => (
                  <div key={p.email} className="flex items-center gap-2 min-w-0">
                    <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-semibold shrink-0">
                      {(p.name ?? p.email)
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <span className="text-[11px] truncate flex-1 min-w-0 text-foreground/80">
                      {p.name ?? p.email}
                    </span>
                    {p.plan && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 capitalize">
                        {p.plan}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `${data?.post?.title ?? "Feedback"} — Feediyo` }];
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const post = await db.query.feedbackPosts.findFirst({
    where: and(
      eq(feedbackPosts.id, params.postId),
      eq(feedbackPosts.organizationId, organizationId),
    ),
  });
  if (!post) throw new Response("Not found", { status: 404 });

  const [
    board,
    voteCountRow,
    currentVote,
    reactionCountRows,
    myReactionRows,
    commentsRaw,
    memberRecord,
    authorRow,
    linearLinkRow,
    linearIntegration,
    jiraLinkRow,
    jiraIntegration,
    asanaLinkRow,
    asanaIntegration,
    shortcutLinkRow,
    shortcutIntegration,
  ] = await Promise.all([
    db.query.feedbackBoards.findFirst({
      where: eq(feedbackBoards.id, post.boardId),
      columns: { slug: true, name: true, visibility: true },
    }),
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(votes)
      .where(eq(votes.postId, post.id)),
    db.query.votes.findFirst({
      where: and(eq(votes.postId, post.id), eq(votes.userId, session.user.id)),
    }),
    db
      .select({ type: reactions.type, count: sql<number>`count(*)`.mapWith(Number) })
      .from(reactions)
      .where(eq(reactions.postId, post.id))
      .groupBy(reactions.type),
    db
      .select({ type: reactions.type })
      .from(reactions)
      .where(and(eq(reactions.postId, post.id), eq(reactions.userId, session.user.id))),
    db
      .select({
        id: comments.id,
        body: comments.body,
        isInternal: comments.isInternal,
        isAiGenerated: comments.isAiGenerated,
        parentId: comments.parentId,
        userId: comments.userId,
        createdAt: comments.createdAt,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
      })
      .from(comments)
      .leftJoin(user, eq(comments.userId, user.id))
      .where(eq(comments.postId, post.id))
      .orderBy(asc(comments.createdAt)),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
    }),
    db.query.user.findFirst({ where: eq(user.id, post.createdBy) }),
    db.query.postExternalLinks.findFirst({
      where: and(eq(postExternalLinks.postId, post.id), eq(postExternalLinks.provider, "linear")),
      columns: { identifier: true, externalTitle: true, externalStatus: true, externalUrl: true },
    }),
    db.query.integrations.findFirst({
      where: and(
        eq(integrations.organizationId, organizationId),
        eq(integrations.provider, "linear"),
      ),
      columns: { id: true },
    }),
    db.query.postExternalLinks.findFirst({
      where: and(eq(postExternalLinks.postId, post.id), eq(postExternalLinks.provider, "jira")),
      columns: { identifier: true, externalTitle: true, externalStatus: true, externalUrl: true },
    }),
    db.query.integrations.findFirst({
      where: and(
        eq(integrations.organizationId, organizationId),
        eq(integrations.provider, "jira"),
      ),
      columns: { id: true },
    }),
    db.query.postExternalLinks.findFirst({
      where: and(eq(postExternalLinks.postId, post.id), eq(postExternalLinks.provider, "asana")),
      columns: { identifier: true, externalTitle: true, externalStatus: true, externalUrl: true },
    }),
    db.query.integrations.findFirst({
      where: and(
        eq(integrations.organizationId, organizationId),
        eq(integrations.provider, "asana"),
      ),
      columns: { id: true },
    }),
    db.query.postExternalLinks.findFirst({
      where: and(eq(postExternalLinks.postId, post.id), eq(postExternalLinks.provider, "shortcut")),
      columns: { identifier: true, externalTitle: true, externalStatus: true, externalUrl: true },
    }),
    db.query.integrations.findFirst({
      where: and(
        eq(integrations.organizationId, organizationId),
        eq(integrations.provider, "shortcut"),
      ),
      columns: { id: true },
    }),
  ]);

  const [voterTraitCountsMap, voterProfiles] = await Promise.all([
    getVoterTraitCountsByPost(organizationId, [post.id]).catch(
      () => ({}) as Record<string, VoterTraitCounts>,
    ),
    getVoterProfilesByPost(organizationId, post.id, 50).catch(() => [] as VoterProfileRow[]),
  ]);
  const voterTraitCounts: VoterTraitCounts = voterTraitCountsMap[post.id] ?? {
    plan: {},
    role: {},
    industry: {},
    location: {},
  };

  // Activities — wrapped in try/catch: table may not exist until `pnpm db:push`
  let activitiesRaw: {
    id: string;
    type: string;
    oldValue: string | null;
    newValue: string;
    userId: string;
    createdAt: Date;
    userName: string | null;
    userImage: string | null;
  }[] = [];
  try {
    activitiesRaw = await db
      .select({
        id: postActivities.id,
        type: postActivities.type,
        oldValue: postActivities.oldValue,
        newValue: postActivities.newValue,
        userId: postActivities.userId,
        createdAt: postActivities.createdAt,
        userName: user.name,
        userImage: user.image,
      })
      .from(postActivities)
      .leftJoin(user, eq(postActivities.userId, user.id))
      .where(eq(postActivities.postId, post.id))
      .orderBy(asc(postActivities.createdAt));
  } catch {
    /* no-op */
  }

  // ── Merge info ────────────────────────────────────────────────────────────
  // Wrapped in try/catch: new columns may not exist until migration is applied.

  let mergedIntoPost: { id: string; title: string } | null = null;
  let mergedChildren: { id: string; title: string; createdAt: string }[] = [];
  let canUnmerge = false;

  try {
    if (post.mergedIntoPostId) {
      const parent = await db.query.feedbackPosts.findFirst({
        where: eq(feedbackPosts.id, post.mergedIntoPostId),
        columns: { id: true, title: true, mergedIntoPostId: true },
      });
      if (parent) {
        mergedIntoPost = { id: parent.id, title: parent.title };
        // Can only unmerge if the surviving post is itself top-level
        canUnmerge = !parent.mergedIntoPostId;
      }
    }

    const childRows = await db.query.feedbackPosts.findMany({
      where: and(
        eq(feedbackPosts.organizationId, organizationId),
        eq(feedbackPosts.mergedIntoPostId, post.id),
      ),
      columns: { id: true, title: true, createdAt: true },
      orderBy: [asc(feedbackPosts.createdAt)],
    });
    mergedChildren = childRows.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    }));
  } catch {
    /* no-op: run pnpm db:push to apply migration */
  }

  // Tags — wrapped in try/catch: tables may not exist until migration is applied
  let postTagList: { id: string; name: string; color: string }[] = [];
  let availableTagList: { id: string; name: string; color: string }[] = [];
  try {
    [postTagList, availableTagList] = await Promise.all([
      getPostTags(post.id),
      getOrgTags(organizationId),
    ]);
  } catch {
    /* no-op: run pnpm db:push to apply migration */
  }

  const reactionCountMap = Object.fromEntries(reactionCountRows.map((r) => [r.type, r.count]));
  const myReactionSet = new Set(myReactionRows.map((r) => r.type));

  const repliesMap = new Map<string, typeof commentsRaw>();
  for (const row of commentsRaw) {
    if (row.parentId) {
      const list = repliesMap.get(row.parentId) ?? [];
      list.push(row);
      repliesMap.set(row.parentId, list);
    }
  }

  const threadedComments: CommentData[] = commentsRaw
    .filter((r) => !r.parentId)
    .map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      replies: (repliesMap.get(c.id) ?? []).map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        parentId: r.parentId!,
      })),
    }));

  return {
    post: {
      ...post,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      voteCount: voteCountRow[0]?.count ?? 0,
      hasVoted: !!currentVote,
      reactionCounts: reactionCountMap as Record<ReactionType, number>,
      myReactions: [...myReactionSet] as ReactionType[],
      authorName: authorRow?.name ?? authorRow?.email ?? "Unknown",
      authorImage: authorRow?.image ?? null,
    },
    board: {
      name: board?.name ?? "General",
      slug: board?.slug ?? "general",
      visibility: board?.visibility ?? "public",
    },
    comments: threadedComments,
    activities: activitiesRaw.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })) as ActivityData[],
    currentUserId: session.user.id,
    currentRole: memberRecord?.role ?? "member",
    orgSlug: params.orgSlug,
    linearLink: linearLinkRow
      ? {
          identifier: linearLinkRow.identifier ?? null,
          externalTitle: linearLinkRow.externalTitle ?? null,
          externalStatus: linearLinkRow.externalStatus ?? null,
          externalUrl: linearLinkRow.externalUrl ?? null,
        }
      : null,
    linearConnected: !!linearIntegration,
    jiraLink: jiraLinkRow
      ? {
          identifier: jiraLinkRow.identifier ?? null,
          externalTitle: jiraLinkRow.externalTitle ?? null,
          externalStatus: jiraLinkRow.externalStatus ?? null,
          externalUrl: jiraLinkRow.externalUrl ?? null,
        }
      : null,
    jiraConnected: !!jiraIntegration,
    asanaLink: asanaLinkRow
      ? {
          identifier: asanaLinkRow.identifier ?? null,
          externalTitle: asanaLinkRow.externalTitle ?? null,
          externalStatus: asanaLinkRow.externalStatus ?? null,
          externalUrl: asanaLinkRow.externalUrl ?? null,
        }
      : null,
    asanaConnected: !!asanaIntegration,
    shortcutLink: shortcutLinkRow
      ? {
          identifier: shortcutLinkRow.identifier ?? null,
          externalTitle: shortcutLinkRow.externalTitle ?? null,
          externalStatus: shortcutLinkRow.externalStatus ?? null,
          externalUrl: shortcutLinkRow.externalUrl ?? null,
        }
      : null,
    shortcutConnected: !!shortcutIntegration,
    mergedIntoPost,
    mergedChildren,
    canUnmerge,
    postTags: postTagList,
    availableTags: availableTagList,
    voterTraitCounts,
    voterProfiles,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedbackDetail({ loaderData }: Route.ComponentProps) {
  const {
    post,
    board,
    comments: initialComments,
    activities: initialActivities,
    currentUserId,
    currentRole,
    orgSlug,
    linearLink: initialLinearLink,
    linearConnected,
    jiraLink: initialJiraLink,
    jiraConnected,
    asanaLink: initialAsanaLink,
    asanaConnected,
    shortcutLink: initialShortcutLink,
    shortcutConnected,
    mergedIntoPost,
    mergedChildren,
    canUnmerge,
    postTags: initialPostTags,
    availableTags,
    voterTraitCounts,
    voterProfiles,
  } = loaderData;

  const qc = useQueryClient();
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const isAdmin = currentRole === "admin";

  // ── State ──────────────────────────────────────────────────────────────────
  const [voteCount, setVoteCount] = useState(post.voteCount);
  const [hasVoted, setHasVoted] = useState(post.hasVoted);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>(
    post.reactionCounts ?? {},
  );
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set(post.myReactions));
  const [pendingReaction, setPendingReaction] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(post.status as Status);
  const [statusOpen, setStatusOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBodies, setReplyBodies] = useState<Record<string, string>>({});

  // ── Merge state ────────────────────────────────────────────────────────────
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSearch, setMergeSearch] = useState("");
  const [mergeDebounced, setMergeDebounced] = useState("");
  const [mergeStep, setMergeStep] = useState<"search" | "confirm">("search");
  const [mergeTarget, setMergeTarget] = useState<{
    id: string;
    title: string;
    status: string;
    voteCount: number;
  } | null>(null);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  // ── Tags state ─────────────────────────────────────────────────────────────
  const [currentTags, setCurrentTags] = useState<{ id: string; name: string; color: string }[]>(
    initialPostTags ?? [],
  );
  const [showTagPicker, setShowTagPicker] = useState(false);

  const addTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "add_to_post", postId: post.id, tagId }),
      });
      if (!res.ok) throw new Error("Failed to add tag");
    },
    onMutate: (tagId) => {
      const tag = availableTags?.find((t) => t.id === tagId);
      if (tag) setCurrentTags((prev) => [...prev, tag]);
    },
    onError: (_err, tagId) => {
      setCurrentTags((prev) => prev.filter((t) => t.id !== tagId));
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "remove_from_post", postId: post.id, tagId }),
      });
      if (!res.ok) throw new Error("Failed to remove tag");
    },
    onMutate: (tagId) => {
      setCurrentTags((prev) => prev.filter((t) => t.id !== tagId));
    },
    onError: (_err, tagId) => {
      const tag = availableTags?.find((t) => t.id === tagId);
      if (tag) setCurrentTags((prev) => [...prev, tag]);
    },
  });

  const unselectedTags = (availableTags ?? []).filter(
    (t) => !currentTags.some((ct) => ct.id === t.id),
  );

  // ── Linear state ───────────────────────────────────────────────────────────
  const [linearLink, setLinearLink] = useState<{
    identifier: string | null;
    externalTitle: string | null;
    externalStatus: string | null;
    externalUrl: string | null;
  } | null>(initialLinearLink);
  const [linearMode, setLinearMode] = useState<"create" | "link" | null>(null);
  const [linkIssueInput, setLinkIssueInput] = useState("");

  const [jiraLink, setJiraLink] = useState<{
    identifier: string | null;
    externalTitle: string | null;
    externalStatus: string | null;
    externalUrl: string | null;
  } | null>(initialJiraLink);
  const [jiraMode, setJiraMode] = useState<"create" | "link" | null>(null);
  const [linkJiraInput, setLinkJiraInput] = useState("");

  const [asanaLink, setAsanaLink] = useState<{
    identifier: string | null;
    externalTitle: string | null;
    externalStatus: string | null;
    externalUrl: string | null;
  } | null>(initialAsanaLink);
  const [asanaMode, setAsanaMode] = useState<"create" | "link" | null>(null);
  const [linkAsanaInput, setLinkAsanaInput] = useState("");

  const [shortcutLink, setShortcutLink] = useState<{
    identifier: string | null;
    externalTitle: string | null;
    externalStatus: string | null;
    externalUrl: string | null;
  } | null>(initialShortcutLink);
  const [shortcutMode, setShortcutMode] = useState<"create" | "link" | null>(null);
  const [linkShortcutInput, setLinkShortcutInput] = useState("");

  // ── Merge search debounce ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setMergeDebounced(mergeSearch), 280);
    return () => clearTimeout(t);
  }, [mergeSearch]);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: commentsData } = useQuery({
    queryKey: ["comments", post.id],
    queryFn: async () => {
      const res = await fetch(`/api/comments?postId=${post.id}`);
      return res.json() as Promise<{ comments: CommentData[] }>;
    },
    initialData: { comments: initialComments },
  });

  const { data: mergeSearchData, isFetching: searchingPosts } = useQuery({
    queryKey: ["merge-search", mergeDebounced, post.id],
    queryFn: async () => {
      const params = new URLSearchParams({ excludePostId: post.id });
      if (mergeDebounced) params.set("search", mergeDebounced);
      const res = await fetch(`/api/merge?${params}`);
      return res.json() as Promise<{
        posts: { id: string; title: string; status: string; voteCount: number }[];
      }>;
    },
    enabled: mergeOpen && mergeStep === "search",
    staleTime: 0,
  });
  const mergeResults = mergeSearchData?.posts ?? [];

  const { data: activitiesData } = useQuery({
    queryKey: ["activities", post.id],
    queryFn: async () => {
      const res = await fetch(`/api/activities?postId=${post.id}`);
      return res.json() as Promise<{ activities: ActivityData[] }>;
    },
    initialData: { activities: initialActivities },
  });

  const threadedComments = commentsData?.comments ?? [];
  const activities = activitiesData?.activities ?? [];

  // Unified feed sorted by time
  type FeedItem =
    | { kind: "comment"; data: CommentData; createdAt: string }
    | { kind: "activity"; data: ActivityData; createdAt: string };

  const feed: FeedItem[] = [
    ...threadedComments.map((c) => ({
      kind: "comment" as const,
      data: c,
      createdAt: c.createdAt,
    })),
    ...activities.map((a) => ({
      kind: "activity" as const,
      data: a,
      createdAt: a.createdAt,
    })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: toggleVote, isPending: voting } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      return res.json() as Promise<{ voted: boolean }>;
    },
    onMutate: () => {
      setHasVoted((v) => !v);
      setVoteCount((c) => (hasVoted ? c - 1 : c + 1));
    },
    onError: () => {
      setHasVoted(post.hasVoted);
      setVoteCount(post.voteCount);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedback"] }),
  });

  const { mutate: toggleReaction } = useMutation({
    mutationFn: async (type: ReactionType) => {
      const res = await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, type }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ reacted: boolean; count: number }>;
    },
    onMutate: (type) => {
      setPendingReaction(type);
      const prevReacted = myReactions.has(type);
      const prevCount = reactionCounts[type] ?? 0;
      setMyReactions((prev) => {
        const next = new Set(prev);
        prevReacted ? next.delete(type) : next.add(type);
        return next;
      });
      setReactionCounts((prev) => ({
        ...prev,
        [type]: Math.max(0, prevCount + (prevReacted ? -1 : 1)),
      }));
      return { prevReacted, prevCount };
    },
    onError: (_err, type, ctx) => {
      if (!ctx) return;
      setMyReactions((prev) => {
        const next = new Set(prev);
        ctx.prevReacted ? next.add(type) : next.delete(type);
        return next;
      });
      setReactionCounts((prev) => ({ ...prev, [type]: ctx.prevCount }));
    },
    onSettled: () => setPendingReaction(null),
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: async (newStatus: Status) => {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "update_status", id: post.id, status: newStatus }),
      });
    },
    onMutate: (newStatus) => setStatus(newStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback"] });
      qc.invalidateQueries({ queryKey: ["activities", post.id] });
    },
  });

  const { mutate: createComment, isPending: creating } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "create",
          postId: post.id,
          body: newComment.trim(),
          isInternal,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      setNewComment("");
      setIsInternal(false);
      qc.invalidateQueries({ queryKey: ["comments", post.id] });
      qc.invalidateQueries({ queryKey: ["feedback"] });
    },
  });

  const { mutate: createReply, isPending: replying } = useMutation({
    mutationFn: async ({ parentId, body }: { parentId: string; body: string }) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "reply", postId: post.id, parentId, body }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_data, vars) => {
      setReplyingTo(null);
      setReplyBodies((prev) => {
        const next = { ...prev };
        delete next[vars.parentId];
        return next;
      });
      qc.invalidateQueries({ queryKey: ["comments", post.id] });
    },
  });

  const { mutate: deleteComment } = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "delete", commentId }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", post.id] });
      qc.invalidateQueries({ queryKey: ["feedback"] });
    },
  });

  // ── Merge mutations ────────────────────────────────────────────────────────

  const { mutate: doMerge, isPending: merging } = useMutation({
    mutationFn: async ({
      sourcePostId,
      targetPostId,
    }: {
      sourcePostId: string;
      targetPostId: string;
    }) => {
      const res = await fetch("/api/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "merge", sourcePostId, targetPostId }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        targetPostId?: string;
      };
      if (!res.ok || json.error) throw new Error(json.error ?? "Merge failed");
      return json;
    },
    onSuccess: (_data, vars) => {
      setMergeOpen(false);
      setMergeStep("search");
      setMergeSearch("");
      setMergeTarget(null);
      qc.invalidateQueries({ queryKey: ["feedback"] });
      // Navigate to the surviving post so the user sees the result
      navigate(`/${orgSlug}/feedback/${vars.targetPostId}`);
    },
  });

  const { mutate: doUnmerge, isPending: unmerging } = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch("/api/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unmerge", postId }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Unmerge failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback"] });
      revalidate(); // reload loader data (mergedChildren, mergedIntoPost, canUnmerge)
    },
  });

  type LinearIssueResult = {
    identifier: string;
    title: string;
    url: string;
    state: { name: string };
  };

  const { mutate: createLinearIssue, isPending: creatingLinearIssue } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/linear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create_issue", postId: post.id }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        issue?: LinearIssueResult;
        error?: string;
      };
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to create issue");
      return json.issue!;
    },
    onSuccess: (issue) => {
      setLinearLink({
        identifier: issue.identifier,
        externalTitle: issue.title,
        externalStatus: issue.state.name,
        externalUrl: issue.url,
      });
      setLinearMode(null);
    },
  });

  const { mutate: linkLinearIssue, isPending: linkingLinearIssue } = useMutation({
    mutationFn: async (issueId: string) => {
      const res = await fetch("/api/linear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "link_issue", postId: post.id, issueId }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        issue?: LinearIssueResult;
        error?: string;
      };
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to link issue");
      return json.issue!;
    },
    onSuccess: (issue) => {
      setLinearLink({
        identifier: issue.identifier,
        externalTitle: issue.title,
        externalStatus: issue.state.name,
        externalUrl: issue.url,
      });
      setLinearMode(null);
      setLinkIssueInput("");
    },
  });

  const { mutate: unlinkLinearIssue, isPending: unlinkingLinearIssue } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/linear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlink_issue", postId: post.id }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to unlink");
    },
    onSuccess: () => setLinearLink(null),
  });

  type JiraIssueResult = {
    id: string;
    key: string;
    url: string;
    summary: string;
    statusName: string;
  };

  const { mutate: createJiraIssue, isPending: creatingJiraIssue } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create_issue", postId: post.id }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        issue?: JiraIssueResult;
        error?: string;
      };
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to create issue");
      return json.issue!;
    },
    onSuccess: (issue) => {
      setJiraLink({
        identifier: issue.key,
        externalTitle: issue.summary,
        externalStatus: issue.statusName,
        externalUrl: issue.url,
      });
      setJiraMode(null);
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: linkJiraIssue, isPending: linkingJiraIssue } = useMutation({
    mutationFn: async (issueKeyOrId: string) => {
      const res = await fetch("/api/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "link_issue", postId: post.id, issueKeyOrId }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        issue?: JiraIssueResult;
        error?: string;
      };
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to link issue");
      return json.issue!;
    },
    onSuccess: (issue) => {
      setJiraLink({
        identifier: issue.key,
        externalTitle: issue.summary,
        externalStatus: issue.statusName,
        externalUrl: issue.url,
      });
      setJiraMode(null);
      setLinkJiraInput("");
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: unlinkJiraIssue, isPending: unlinkingJiraIssue } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlink_issue", postId: post.id }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to unlink");
    },
    onSuccess: () => setJiraLink(null),
  });

  type AsanaTaskResult = {
    gid: string;
    name: string;
    url: string;
    sectionGid: string | null;
    sectionName: string | null;
    completed: boolean;
  };

  const { mutate: createAsanaTask, isPending: creatingAsanaTask } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/asana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create_task", postId: post.id }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        task?: AsanaTaskResult;
        error?: string;
      };
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to create task");
      return json.task!;
    },
    onSuccess: (task) => {
      setAsanaLink({
        identifier: task.gid,
        externalTitle: task.name,
        externalStatus: task.completed ? "Completed" : (task.sectionName ?? ""),
        externalUrl: task.url,
      });
      setAsanaMode(null);
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: linkAsanaTask, isPending: linkingAsanaTask } = useMutation({
    mutationFn: async (taskInput: string) => {
      const res = await fetch("/api/asana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "link_task", postId: post.id, taskInput }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        task?: AsanaTaskResult;
        error?: string;
      };
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to link task");
      return json.task!;
    },
    onSuccess: (task) => {
      setAsanaLink({
        identifier: task.gid,
        externalTitle: task.name,
        externalStatus: task.completed ? "Completed" : (task.sectionName ?? ""),
        externalUrl: task.url,
      });
      setAsanaMode(null);
      setLinkAsanaInput("");
    },
    onError: (err) => alert(err.message),
  });

  const { mutate: unlinkAsanaTask, isPending: unlinkingAsanaTask } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/asana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlink_task", postId: post.id }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to unlink");
    },
    onSuccess: () => setAsanaLink(null),
  });

  const { mutate: createShortcutStory, isPending: creatingShortcutStory } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/shortcut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create_story", postId: post.id }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        story?: { id: number; name: string; app_url: string };
        error?: string;
      };
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to create story");
      return json.story;
    },
    onSuccess: (story) => {
      if (story) {
        setShortcutLink({
          identifier: `SC-${story.id}`,
          externalTitle: story.name,
          externalStatus: null,
          externalUrl: story.app_url,
        });
        setShortcutMode(null);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: linkShortcutStory, isPending: linkingShortcutStory } = useMutation({
    mutationFn: async (storyId: string) => {
      const res = await fetch("/api/shortcut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "link_story", postId: post.id, storyId }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        story?: { id: number; name: string; app_url: string };
        error?: string;
      };
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to link story");
      return json.story;
    },
    onSuccess: (story) => {
      if (story) {
        setShortcutLink({
          identifier: `SC-${story.id}`,
          externalTitle: story.name,
          externalStatus: null,
          externalUrl: story.app_url,
        });
        setShortcutMode(null);
        setLinkShortcutInput("");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: unlinkShortcutStory, isPending: unlinkingShortcutStory } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/shortcut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unlink_story", postId: post.id }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to unlink");
    },
    onSuccess: () => setShortcutLink(null),
  });

  // ── Derived ────────────────────────────────────────────────────────────────
  const cfg = STATUS_CONFIG[status];
  const nextStatus = STATUS_NEXT[status];
  const totalComments = threadedComments.reduce((acc, c) => acc + 1 + c.replies.length, 0);
  const heartCount = reactionCounts.heart ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Top toolbar ─────────────────────────────────────────────────── */}
      <header className="flex items-center h-11 px-4 border-b shrink-0 gap-2">
        <button
          type="button"
          onClick={() => navigate(`/${orgSlug}/dashboard`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-medium">{board.name}</span>
        </button>

        <span className="text-muted-foreground/30 select-none">/</span>
        <p className="text-sm text-foreground/70 truncate flex-1 min-w-0">{post.title}</p>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>

          {isAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAdminMenuOpen((o) => !o)}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {adminMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAdminMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border bg-popover shadow-lg py-1">
                    {!post.mergedIntoPostId && (
                      <button
                        type="button"
                        onClick={() => {
                          setAdminMenuOpen(false);
                          setMergeOpen(true);
                          setMergeStep("search");
                          setMergeSearch("");
                          setMergeTarget(null);
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs hover:bg-muted transition-colors"
                      >
                        <GitMerge className="h-3.5 w-3.5" />
                        Merge post
                      </button>
                    )}
                    <button
                      type="button"
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-destructive hover:bg-muted transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete post
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Two-column body ──────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-7">
            {/* ── Merged-into banner ─────────────────────────────────────── */}
            {post.mergedIntoPostId && mergedIntoPost && (
              <div className="flex items-start gap-3 mb-5 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
                <GitMerge className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-violet-800 dark:text-violet-200">
                    This post was merged into{" "}
                    <Link
                      to={`/${orgSlug}/feedback/${mergedIntoPost.id}`}
                      className="font-semibold underline underline-offset-2 hover:no-underline"
                    >
                      {mergedIntoPost.title}
                    </Link>
                  </p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                    Votes and comments are consolidated on the surviving post.
                  </p>
                </div>
                {isAdmin && canUnmerge && (
                  <button
                    type="button"
                    onClick={() => doUnmerge(post.id)}
                    disabled={unmerging}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-violet-300 dark:border-violet-600 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900 disabled:opacity-50 transition-colors"
                  >
                    {unmerging ? "Unmerging…" : "Unmerge"}
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-4 items-start">
              {/* Upvote pill */}
              <button
                type="button"
                onClick={() => !voting && toggleVote()}
                disabled={voting}
                className={cn(
                  "flex flex-col items-center gap-0.5 w-11 shrink-0 mt-1 rounded-md border px-1 py-2 text-xs font-semibold transition-colors",
                  hasVoted
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                )}
              >
                <ChevronUp className="h-3.5 w-3.5" />
                <span>{voteCount}</span>
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title */}
                <h1 className="text-2xl font-semibold leading-snug mb-3">{post.title}</h1>

                {/* Description */}
                {post.description && (
                  <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap mb-5">
                    {post.description}
                  </p>
                )}

                {/* Stats bar */}
                <div className="flex items-center gap-4 mb-5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    <span>{totalComments}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleReaction("heart")}
                    disabled={pendingReaction === "heart"}
                    className={cn(
                      "flex items-center gap-1.5 transition-colors",
                      myReactions.has("heart") ? "text-rose-500" : "hover:text-foreground",
                      pendingReaction === "heart" && "opacity-60",
                    )}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4 transition-all",
                        myReactions.has("heart") && "fill-current",
                      )}
                    />
                    <span>{heartCount}</span>
                  </button>
                </div>

                {/* ── Comments ──────────────────────────────────────────────── */}
                <div className="space-y-5">
                  {/* Comment input box */}
                  <div className="rounded-lg border bg-card overflow-hidden">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      rows={3}
                      className="w-full px-4 py-3 text-sm bg-transparent focus:outline-none resize-none placeholder:text-muted-foreground/60"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && newComment.trim()) {
                          createComment();
                        }
                      }}
                    />
                    <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/20">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          title="Add emoji"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Smile className="h-4 w-4" />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setIsInternal((v) => !v)}
                            title={
                              isInternal ? "Internal note — click to toggle" : "Make internal note"
                            }
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              isInternal
                                ? "text-amber-600 bg-amber-50 dark:bg-amber-950/40"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted",
                            )}
                          >
                            <Lock className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (newComment.trim()) createComment();
                        }}
                        disabled={creating || !newComment.trim()}
                        className="px-3.5 py-1.5 text-xs font-medium rounded-md border bg-card hover:bg-muted disabled:opacity-40 transition-colors"
                      >
                        {creating ? "Posting…" : "Comment"}
                      </button>
                    </div>
                  </div>

                  {/* Feed: activities + comments interleaved */}
                  {feed.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      No activity yet. Leave the first comment!
                    </p>
                  ) : (
                    <div className="space-y-0.5">
                      {feed.map((item) => {
                        /* ── Activity item ─────────────────────────────────── */
                        if (item.kind === "activity") {
                          const a = item.data;

                          // merged: someone merged another post into this one (shown on surviving post)
                          if (a.type === "merged") {
                            return (
                              <div
                                key={a.id}
                                className="flex items-center gap-2 py-2.5 text-sm text-muted-foreground flex-wrap"
                              >
                                <GitMerge className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                                <span className="font-medium text-foreground/80">
                                  {a.userName ?? "Someone"}
                                </span>
                                <span>merged</span>
                                <Link
                                  to={`/${orgSlug}/feedback/${a.newValue}`}
                                  className="font-medium text-foreground/80 hover:text-foreground underline underline-offset-2 hover:no-underline max-w-[160px] truncate"
                                >
                                  {a.oldValue ?? "a post"}
                                </Link>
                                <span>into this post</span>
                                <span className="text-muted-foreground/40">·</span>
                                <span className="text-xs">{timeAgo(a.createdAt)}</span>
                              </div>
                            );
                          }

                          // merged_into: this post was merged into another (shown on the merged post)
                          if (a.type === "merged_into") {
                            return (
                              <div
                                key={a.id}
                                className="flex items-center gap-2 py-2.5 text-sm text-muted-foreground flex-wrap"
                              >
                                <GitMerge className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                                <span className="font-medium text-foreground/80">
                                  {a.userName ?? "Someone"}
                                </span>
                                <span>merged this post into</span>
                                <Link
                                  to={`/${orgSlug}/feedback/${a.newValue}`}
                                  className="font-medium text-foreground/80 hover:text-foreground underline underline-offset-2 hover:no-underline max-w-[160px] truncate"
                                >
                                  {a.oldValue ?? "another post"}
                                </Link>
                                <span className="text-muted-foreground/40">·</span>
                                <span className="text-xs">{timeAgo(a.createdAt)}</span>
                              </div>
                            );
                          }

                          // unmerged: a post was separated back out (shown on surviving post)
                          if (a.type === "unmerged") {
                            return (
                              <div
                                key={a.id}
                                className="flex items-center gap-2 py-2.5 text-sm text-muted-foreground flex-wrap"
                              >
                                <GitMerge className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                                <span className="font-medium text-foreground/80">
                                  {a.userName ?? "Someone"}
                                </span>
                                <span>unmerged</span>
                                <span className="font-medium text-foreground/80 max-w-[160px] truncate">
                                  {a.oldValue ?? "a post"}
                                </span>
                                <span>from this post</span>
                                <span className="text-muted-foreground/40">·</span>
                                <span className="text-xs">{timeAgo(a.createdAt)}</span>
                              </div>
                            );
                          }

                          const newSt = a.newValue as Status;
                          const stCfg = STATUS_CONFIG[newSt];
                          return (
                            <div
                              key={a.id}
                              className="flex items-center gap-2.5 py-2.5 text-sm text-muted-foreground"
                            >
                              <StatusCircleIcon status={newSt} size={16} />
                              <span className="font-medium text-foreground/80">
                                {a.userName ?? "Someone"}
                              </span>
                              <span>changed status to</span>
                              <span className={cn("font-semibold", stCfg?.textColor)}>
                                {stCfg?.label ?? newSt}
                              </span>
                              <span className="text-muted-foreground/50">·</span>
                              <span className="text-xs">{timeAgo(a.createdAt)}</span>
                            </div>
                          );
                        }

                        /* ── Comment item ──────────────────────────────────── */
                        const c = item.data;
                        const canDelete = isAdmin || c.userId === currentUserId;
                        const displayName = c.userName ?? c.userEmail ?? "Unknown";

                        return (
                          <div key={c.id} className="py-3">
                            <div className="flex gap-3">
                              <Avatar name={c.userName} image={c.userImage} size={28} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="text-sm font-medium">{displayName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {timeAgo(c.createdAt)}
                                  </span>
                                  {c.isInternal && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                      <Lock className="h-2.5 w-2.5" />
                                      Internal
                                    </span>
                                  )}
                                  {c.isAiGenerated && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                                      AI
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                                  {c.body}
                                </p>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <CornerDownRight className="h-3 w-3" />
                                    Reply
                                  </button>
                                  {canDelete && (
                                    <button
                                      type="button"
                                      onClick={() => deleteComment(c.id)}
                                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Delete
                                    </button>
                                  )}
                                </div>

                                {/* Inline reply box */}
                                {replyingTo === c.id && (
                                  <div className="mt-2 space-y-2">
                                    <textarea
                                      value={replyBodies[c.id] ?? ""}
                                      onChange={(e) =>
                                        setReplyBodies((prev) => ({
                                          ...prev,
                                          [c.id]: e.target.value,
                                        }))
                                      }
                                      placeholder="Write a reply…"
                                      rows={2}
                                      className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const body = replyBodies[c.id]?.trim();
                                          if (body) createReply({ parentId: c.id, body });
                                        }}
                                        disabled={replying || !replyBodies[c.id]?.trim()}
                                        className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                                      >
                                        {replying ? "Sending…" : "Reply"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setReplyingTo(null)}
                                        className="px-3 py-1 text-xs font-medium hover:bg-muted rounded-md"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Nested replies */}
                                {c.replies.length > 0 && (
                                  <div className="mt-3 space-y-3 pl-4 border-l-2 border-border/40">
                                    {c.replies.map((reply) => {
                                      const canDeleteReply =
                                        isAdmin || reply.userId === currentUserId;
                                      const replyName =
                                        reply.userName ?? reply.userEmail ?? "Unknown";
                                      return (
                                        <div key={reply.id} className="flex gap-2.5">
                                          <Avatar
                                            name={reply.userName}
                                            image={reply.userImage}
                                            size={22}
                                          />
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                              <span className="text-sm font-medium">
                                                {replyName}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                {timeAgo(reply.createdAt)}
                                              </span>
                                            </div>
                                            <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                                              {reply.body}
                                            </p>
                                            {canDeleteReply && (
                                              <button
                                                type="button"
                                                onClick={() => deleteComment(reply.id)}
                                                className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                                Delete
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {/* end flex-1 content */}
            </div>
            {/* end flex gap-4 */}
          </div>
        </div>

        {/* Vertical divider */}
        <div className="w-px bg-border shrink-0" />

        {/* ── Right sidebar ─────────────────────────────────────────────── */}
        <div className="w-64 shrink-0 overflow-y-auto p-5 space-y-5">
          {/* Author card */}
          <div className="flex items-center gap-3">
            <Avatar name={post.authorName} image={post.authorImage} size={38} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{post.authorName}</p>
              <p className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</p>
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            {/* Board */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-14 shrink-0">Board</span>
              <Link
                to={`/${orgSlug}/dashboard`}
                className="flex items-center gap-1.5 flex-1 min-w-0 px-2.5 py-1.5 rounded-md bg-muted/50 hover:bg-muted text-xs font-medium transition-colors"
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: board.visibility === "public" ? "#22c55e" : "#94a3b8",
                  }}
                />
                <span className="truncate">{board.name}</span>
              </Link>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-14 shrink-0">Status</span>
              <div className="relative flex-1">
                {isAdmin ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setStatusOpen((o) => !o)}
                      className={cn(
                        "flex items-center gap-1.5 w-full px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                        cfg.bgColor,
                        cfg.textColor,
                      )}
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: cfg.dotColor }}
                      />
                      <span className="flex-1 text-left">{cfg.label}</span>
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    </button>
                    {statusOpen && (
                      <div className="absolute left-0 top-full mt-1 z-20 w-44 rounded-lg border bg-popover shadow-lg py-1">
                        {(
                          Object.entries(STATUS_CONFIG) as [
                            Status,
                            (typeof STATUS_CONFIG)[Status],
                          ][]
                        ).map(([s, c]) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              updateStatus(s);
                              setStatusOpen(false);
                            }}
                            className={cn(
                              "flex items-center gap-2.5 w-full px-3 py-1.5 text-xs hover:bg-muted transition-colors",
                              s === status && "font-semibold",
                            )}
                          >
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: c.dotColor }}
                            />
                            {c.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium",
                      cfg.bgColor,
                      cfg.textColor,
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: cfg.dotColor }}
                    />
                    {cfg.label}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Tags</span>
              {isAdmin && unselectedTags.length > 0 && (
                <button
                  type="button"
                  title="Add tag"
                  onClick={() => setShowTagPicker((p) => !p)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Tag picker dropdown */}
            {showTagPicker && isAdmin && (
              <div className="rounded-md border bg-popover shadow-md overflow-hidden">
                {unselectedTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      addTagMutation.mutate(tag.id);
                      setShowTagPicker(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors text-left"
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </button>
                ))}
              </div>
            )}

            {/* Applied tags */}
            {currentTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {currentTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
                  >
                    {tag.name}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => removeTagMutation.mutate(tag.id)}
                        className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                        aria-label={`Remove tag ${tag.name}`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-3 w-3" />
                No tags
              </p>
            )}
          </div>

          {/* Voter Insights */}
          <VoterInsights
            voteCount={voteCount}
            traitCounts={voterTraitCounts}
            profiles={voterProfiles}
            orgSlug={orgSlug}
          />

          {/* Linked Issues */}
          <div className="border-t pt-4">
            <p className="text-xs font-medium mb-3">Linked Issues</p>
          </div>

          {/* Jira */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <JiraIcon size={14} />
                <span className="text-xs font-medium">Jira</span>
              </div>
              {isAdmin && jiraConnected && jiraLink && (
                <a
                  href={jiraLink.externalUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Open in Jira"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {!jiraConnected && isAdmin && (
              <p className="text-xs text-muted-foreground">
                <Link
                  to={`/${orgSlug}/settings/integrations/jira`}
                  className="underline hover:text-foreground"
                >
                  Connect Jira
                </Link>{" "}
                to link issues.
              </p>
            )}

            {jiraConnected && !jiraLink && jiraMode === null && isAdmin && (
              <button
                type="button"
                onClick={() => setJiraMode("create")}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Link to Jira issue
              </button>
            )}

            {jiraConnected && !jiraLink && jiraMode === "create" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Create a new Jira issue from this post using the default project.
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => createJiraIssue()}
                    disabled={creatingJiraIssue}
                    className="flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md text-white disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: "#2684FF" }}
                  >
                    {creatingJiraIssue ? "Creating…" : "Create issue"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setJiraMode("link")}
                    className="px-2 py-1.5 text-xs rounded-md hover:bg-muted border transition-colors"
                  >
                    Link existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setJiraMode(null)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {jiraConnected && !jiraLink && jiraMode === "link" && (
              <div className="space-y-1.5">
                <input
                  value={linkJiraInput}
                  onChange={(e) => setLinkJiraInput(e.target.value)}
                  placeholder="Issue key (e.g. PROJ-42)"
                  className="w-full px-2.5 py-1.5 text-xs border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && linkJiraInput.trim()) {
                      linkJiraIssue(linkJiraInput.trim());
                    }
                  }}
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => linkJiraIssue(linkJiraInput.trim())}
                    disabled={linkingJiraIssue || !linkJiraInput.trim()}
                    className="flex-1 px-2.5 py-1.5 text-xs font-medium bg-foreground text-background rounded-md disabled:opacity-50 transition-colors"
                  >
                    {linkingJiraIssue ? "Linking…" : "Link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setJiraMode(null);
                      setLinkJiraInput("");
                    }}
                    className="px-2 py-1.5 text-xs rounded-md hover:bg-muted border transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {jiraLink && (
              <div className="rounded-md border bg-muted/30 px-3 py-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-mono font-semibold" style={{ color: "#2684FF" }}>
                    {jiraLink.identifier}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => unlinkJiraIssue()}
                      disabled={unlinkingJiraIssue}
                      title="Unlink issue"
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {jiraLink.externalTitle && (
                  <p className="text-xs text-foreground/80 leading-snug line-clamp-2">
                    {jiraLink.externalTitle}
                  </p>
                )}
                {jiraLink.externalStatus && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {jiraLink.externalStatus}
                  </span>
                )}
                {jiraLink.externalUrl && (
                  <a
                    href={jiraLink.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    View in Jira
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Asana section */}
          <div className="border-t pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AsanaIcon size={14} />
                <span className="text-xs font-medium">Asana</span>
              </div>
              {isAdmin && asanaConnected && asanaLink && (
                <a
                  href={asanaLink.externalUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Open in Asana"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {!asanaConnected && isAdmin && (
              <p className="text-xs text-muted-foreground">
                <Link
                  to={`/${orgSlug}/settings/integrations/asana`}
                  className="underline hover:text-foreground"
                >
                  Connect Asana
                </Link>{" "}
                to link tasks.
              </p>
            )}

            {asanaConnected && !asanaLink && asanaMode === null && isAdmin && (
              <button
                type="button"
                onClick={() => setAsanaMode("create")}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Link to Asana task
              </button>
            )}

            {asanaConnected && !asanaLink && asanaMode === "create" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Create a new Asana task from this post using the default project.
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => createAsanaTask()}
                    disabled={creatingAsanaTask}
                    className="flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md text-white disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: "#F06A6A" }}
                  >
                    {creatingAsanaTask ? "Creating…" : "Create task"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsanaMode("link")}
                    className="px-2 py-1.5 text-xs rounded-md hover:bg-muted border transition-colors"
                  >
                    Link existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setAsanaMode(null)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {asanaConnected && !asanaLink && asanaMode === "link" && (
              <div className="space-y-1.5">
                <input
                  value={linkAsanaInput}
                  onChange={(e) => setLinkAsanaInput(e.target.value)}
                  placeholder="Task GID or Asana URL"
                  className="w-full px-2.5 py-1.5 text-xs border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && linkAsanaInput.trim()) {
                      linkAsanaTask(linkAsanaInput.trim());
                    }
                  }}
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => linkAsanaTask(linkAsanaInput.trim())}
                    disabled={linkingAsanaTask || !linkAsanaInput.trim()}
                    className="flex-1 px-2.5 py-1.5 text-xs font-medium bg-foreground text-background rounded-md disabled:opacity-50 transition-colors"
                  >
                    {linkingAsanaTask ? "Linking…" : "Link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAsanaMode(null);
                      setLinkAsanaInput("");
                    }}
                    className="px-2 py-1.5 text-xs rounded-md hover:bg-muted border transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {asanaLink && (
              <div className="rounded-md border bg-muted/30 px-3 py-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="text-xs font-mono font-semibold truncate"
                    style={{ color: "#F06A6A" }}
                    title={asanaLink.identifier ?? undefined}
                  >
                    {asanaLink.externalTitle
                      ? asanaLink.externalTitle.slice(0, 20) +
                        (asanaLink.externalTitle.length > 20 ? "…" : "")
                      : asanaLink.identifier}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => unlinkAsanaTask()}
                      disabled={unlinkingAsanaTask}
                      title="Unlink task"
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {asanaLink.externalStatus && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                    {asanaLink.externalStatus}
                  </span>
                )}
                {asanaLink.externalUrl && (
                  <a
                    href={asanaLink.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    View in Asana
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Shortcut section */}
          <div className="border-t pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShortcutIcon size={14} />
                <span className="text-xs font-medium">Shortcut</span>
              </div>
              {isAdmin && shortcutConnected && shortcutLink && (
                <a
                  href={shortcutLink.externalUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Open in Shortcut"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {!shortcutConnected && isAdmin && (
              <p className="text-xs text-muted-foreground">
                <Link
                  to={`/${orgSlug}/settings/integrations/shortcut`}
                  className="underline hover:text-foreground"
                >
                  Connect Shortcut
                </Link>{" "}
                to link stories.
              </p>
            )}

            {shortcutConnected && !shortcutLink && shortcutMode === null && isAdmin && (
              <button
                type="button"
                onClick={() => setShortcutMode("create")}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Link to Shortcut story
              </button>
            )}

            {shortcutConnected && !shortcutLink && shortcutMode === "create" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Create a new Shortcut story from this post using the default workflow.
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => createShortcutStory()}
                    disabled={creatingShortcutStory}
                    className="flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md text-white disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: "#6515DD" }}
                  >
                    {creatingShortcutStory ? "Creating…" : "Create story"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShortcutMode("link")}
                    className="px-2 py-1.5 text-xs rounded-md hover:bg-muted border transition-colors"
                  >
                    Link existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setShortcutMode(null)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {shortcutConnected && !shortcutLink && shortcutMode === "link" && (
              <div className="space-y-1.5">
                <input
                  value={linkShortcutInput}
                  onChange={(e) => setLinkShortcutInput(e.target.value)}
                  placeholder="Story ID (e.g. 42)"
                  className="w-full px-2.5 py-1.5 text-xs border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && linkShortcutInput.trim()) {
                      linkShortcutStory(linkShortcutInput.trim());
                    }
                  }}
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => linkShortcutStory(linkShortcutInput.trim())}
                    disabled={linkingShortcutStory || !linkShortcutInput.trim()}
                    className="flex-1 px-2.5 py-1.5 text-xs font-medium bg-foreground text-background rounded-md disabled:opacity-50 transition-colors"
                  >
                    {linkingShortcutStory ? "Linking…" : "Link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShortcutMode(null);
                      setLinkShortcutInput("");
                    }}
                    className="px-2 py-1.5 text-xs rounded-md hover:bg-muted border transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {shortcutLink && (
              <div className="rounded-md border bg-muted/30 px-3 py-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-mono font-semibold" style={{ color: "#6515DD" }}>
                    {shortcutLink.identifier}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => unlinkShortcutStory()}
                      disabled={unlinkingShortcutStory}
                      title="Unlink story"
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {shortcutLink.externalTitle && (
                  <p className="text-xs text-foreground/80 leading-snug line-clamp-2">
                    {shortcutLink.externalTitle}
                  </p>
                )}
                {shortcutLink.externalStatus && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    {shortcutLink.externalStatus}
                  </span>
                )}
                {shortcutLink.externalUrl && (
                  <a
                    href={shortcutLink.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    View in Shortcut
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Linear section */}
          <div className="border-t pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <LinearIcon size={14} />
                <span className="text-xs font-medium">Linear</span>
              </div>
              {isAdmin && linearConnected && linearLink && (
                <a
                  href={linearLink.externalUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Open in Linear"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {!linearConnected && isAdmin && (
              <p className="text-xs text-muted-foreground">
                <Link
                  to={`/${orgSlug}/settings/integrations/linear`}
                  className="underline hover:text-foreground"
                >
                  Connect Linear
                </Link>{" "}
                to link issues.
              </p>
            )}

            {linearConnected && !linearLink && linearMode === null && isAdmin && (
              <button
                type="button"
                onClick={() => setLinearMode("create")}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Link to Linear issue
              </button>
            )}

            {linearConnected && !linearLink && linearMode === "create" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Create a new Linear issue from this post.
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => createLinearIssue()}
                    disabled={creatingLinearIssue}
                    className="flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md text-white disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: "#5E6AD2" }}
                  >
                    {creatingLinearIssue ? "Creating…" : "Create issue"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinearMode("link")}
                    className="px-2 py-1.5 text-xs rounded-md hover:bg-muted border transition-colors"
                  >
                    Link existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinearMode(null)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {linearConnected && !linearLink && linearMode === "link" && (
              <div className="space-y-1.5">
                <input
                  value={linkIssueInput}
                  onChange={(e) => setLinkIssueInput(e.target.value)}
                  placeholder="Issue ID or ENG-123"
                  className="w-full px-2.5 py-1.5 text-xs border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && linkIssueInput.trim()) {
                      linkLinearIssue(linkIssueInput.trim());
                    }
                  }}
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => linkLinearIssue(linkIssueInput.trim())}
                    disabled={linkingLinearIssue || !linkIssueInput.trim()}
                    className="flex-1 px-2.5 py-1.5 text-xs font-medium bg-foreground text-background rounded-md disabled:opacity-50 transition-colors"
                  >
                    {linkingLinearIssue ? "Linking…" : "Link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLinearMode(null);
                      setLinkIssueInput("");
                    }}
                    className="px-2 py-1.5 text-xs rounded-md hover:bg-muted border transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {linearLink && (
              <div className="rounded-md border bg-muted/30 px-3 py-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-mono font-semibold" style={{ color: "#5E6AD2" }}>
                    {linearLink.identifier}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => unlinkLinearIssue()}
                      disabled={unlinkingLinearIssue}
                      title="Unlink issue"
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {linearLink.externalTitle && (
                  <p className="text-xs text-foreground/80 leading-snug line-clamp-2">
                    {linearLink.externalTitle}
                  </p>
                )}
                {linearLink.externalStatus && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                    {linearLink.externalStatus}
                  </span>
                )}
                {linearLink.externalUrl && (
                  <a
                    href={linearLink.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    View in Linear
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Merge dialog ─────────────────────────────────────────────── */}
      {mergeOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            onClick={() => setMergeOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-popover border rounded-xl shadow-xl p-6">
            {mergeStep === "search" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Merge into another post</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Votes and comments will be combined on the target post. This can be undone.
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={mergeSearch}
                    onChange={(e) => setMergeSearch(e.target.value)}
                    placeholder="Search posts…"
                    autoFocus
                    className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto -mx-1 px-1">
                  {searchingPosts && (
                    <p className="text-xs text-muted-foreground py-4 text-center">Searching…</p>
                  )}
                  {!searchingPosts && mergeResults.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No posts found.
                    </p>
                  )}
                  {mergeResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setMergeTarget(p);
                        setMergeStep("confirm");
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-muted text-left transition-colors"
                    >
                      <StatusCircleIcon status={p.status as Status} size={14} />
                      <span className="flex-1 text-sm truncate">{p.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {p.voteCount} votes
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMergeOpen(false)}
                    className="px-4 py-2 text-xs font-medium rounded-lg hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {mergeStep === "confirm" && mergeTarget && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Confirm merge</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    This will merge{" "}
                    <span className="font-medium text-foreground">"{post.title}"</span> into{" "}
                    <span className="font-medium text-foreground">"{mergeTarget.title}"</span>.
                    Votes and comments will be consolidated. This can be undone.
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setMergeStep("search")}
                    className="px-4 py-2 text-xs font-medium rounded-lg border hover:bg-muted transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => doMerge({ sourcePostId: post.id, targetPostId: mergeTarget.id })}
                    disabled={merging}
                    className="px-4 py-2 text-xs font-medium bg-foreground text-background rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {merging ? "Merging…" : "Merge post"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Bottom action bar (admin + has next status) ────────────────── */}
      {isAdmin && nextStatus && (
        <div className="flex items-center justify-center h-14 border-t shrink-0 bg-background">
          <button
            type="button"
            onClick={() => updateStatus(nextStatus)}
            className="flex items-center gap-1.5 px-6 py-2 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            Mark {STATUS_CONFIG[nextStatus].label}
          </button>
        </div>
      )}
    </div>
  );
}

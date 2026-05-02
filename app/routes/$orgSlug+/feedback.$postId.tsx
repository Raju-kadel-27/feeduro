import { requireOrgBySlug } from "@lib/session.server";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, asc, eq, sql } from "drizzle-orm";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  GitFork,
  Heart,
  Info,
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
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { getDb } from "@/db";
import {
  comments,
  feedbackBoards,
  feedbackPosts,
  member,
  postActivities,
  reactions,
  user,
  votes,
} from "@/db/schema";
import type { Route } from "./+types/feedback.$postId";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "open" | "reviewing" | "planned" | "in-progress" | "completed" | "closed";
type ReactionType = "heart";

interface CommentData {
  id: string;
  body: string;
  isInternal: boolean;
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
  ]);

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
  } = loaderData;

  const qc = useQueryClient();
  const navigate = useNavigate();
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

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: commentsData } = useQuery({
    queryKey: ["comments", post.id],
    queryFn: async () => {
      const res = await fetch(`/api/comments?postId=${post.id}`);
      return res.json() as Promise<{ comments: CommentData[] }>;
    },
    initialData: { comments: initialComments },
  });

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

  // ── Derived ────────────────────────────────────────────────────────────────
  const cfg = STATUS_CONFIG[status];
  const nextStatus = STATUS_NEXT[status];
  const totalComments = threadedComments.reduce((acc, c) => acc + 1 + c.replies.length, 0);
  const heartCount = reactionCounts["heart"] ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Top toolbar ─────────────────────────────────────────────────── */}
      <header className="flex items-center h-11 px-3 border-b shrink-0 gap-1">
        <button
          type="button"
          onClick={() => navigate(`/${orgSlug}/dashboard`)}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground mr-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-0.5">
          <ToolbarBtn icon={<GitFork className="h-4 w-4" />} title="Linked issues" />
          <ToolbarBtn icon={<Search className="h-4 w-4" />} title="Search" />
          <ToolbarBtn icon={<Share2 className="h-4 w-4" />} title="Share" />
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{totalComments}</span>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="ml-1 p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Delete post"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      {/* ── Two-column body ──────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-7">
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

                  <button
                    type="button"
                    className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
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
                                      autoFocus
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

          {/* Tags (placeholder) */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Tags</span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  title="About tags"
                  className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                >
                  <Info className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title="Add tag"
                  className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
            <button
              type="button"
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <Tag className="h-3 w-3" />
              No tags
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom action bar (admin + has next status) ────────────────── */}
      {isAdmin && nextStatus && (
        <div className="flex items-center justify-center gap-3 h-14 border-t shrink-0 bg-background">
          <button
            type="button"
            onClick={() => navigate(`/${orgSlug}/dashboard`)}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full border text-sm font-medium hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Close
          </button>
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

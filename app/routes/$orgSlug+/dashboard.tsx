import { CreateFeedbackDialog } from "@components/feedback/create-feedback-dialog";
import { AppSidebar } from "@components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { Skeleton } from "@components/ui/skeleton";
import { getBoards, getEnrichedPosts } from "@lib/queries.server";
import { requireOrgBySlug } from "@lib/session.server";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { ChevronUp, MessageSquare, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, redirect, useParams, useSearchParams } from "react-router";
import { getDb } from "@/db";
import { member, user as userTable } from "@/db/schema";
import type { Route } from "./+types/dashboard";

export function meta() {
  return [{ title: "Requests – Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, org } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const [memberRecord, orgMembers, posts, boardsData] = await Promise.all([
    db.query.member.findFirst({
      where: and(eq(member.organizationId, org.id), eq(member.userId, session.user.id)),
    }),
    db
      .select({
        userId: member.userId,
        name: userTable.name,
        image: userTable.image,
      })
      .from(member)
      .innerJoin(userTable, eq(member.userId, userTable.id))
      .where(eq(member.organizationId, org.id)),
    getEnrichedPosts(org.id, session.user.id),
    getBoards(org.id),
  ]);

  if (boardsData.boards.length === 0) {
    throw redirect(`/${params.orgSlug}/settings/feedback`);
  }

  const usersMap: Record<string, { name: string; image: string | null }> = Object.fromEntries(
    orgMembers.map((m) => [m.userId, { name: m.name, image: m.image }]),
  );

  return {
    user: session.user,
    isAdmin: memberRecord?.role === "admin",
    usersMap,
    posts,
    boards: boardsData.boards,
    statusCounts: boardsData.statusCounts,
    boardsLimit: boardsData.limit,
    fetchedAt: Date.now(),
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "open" | "reviewing" | "planned" | "in-progress" | "completed" | "closed";

interface Post {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  createdAt: string;
  boardId: string;
  createdBy: string;
  voteCount: number;
  hasVoted: boolean;
  commentCount: number;
}

interface Board {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  postCount: number;
}

// ─── Status Icon ──────────────────────────────────────────────────────────────

function StatusCircleIcon({ status }: { status: Status }) {
  const size = 20;
  const cx = 10;
  const cy = 10;
  const r = 8;

  if (status === "completed") {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <circle cx={cx} cy={cy} r={r} fill="#22c55e" />
        <polyline
          points="6,10 9,13 14,7"
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
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <circle cx={cx} cy={cy} r={r} stroke="#f87171" strokeWidth="1.5" />
        <line
          x1="7"
          y1="7"
          x2="13"
          y2="13"
          stroke="#f87171"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="13"
          y1="7"
          x2="7"
          y2="13"
          stroke="#f87171"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (status === "in-progress") {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <circle cx={cx} cy={cy} r={r} stroke="#8b5cf6" strokeWidth="1.5" />
        <path d={`M${cx},${cy - r} A${r},${r} 0 0,1 ${cx},${cy + r} Z`} fill="#8b5cf6" />
      </svg>
    );
  }

  if (status === "reviewing") {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <circle cx={cx} cy={cy} r={r} stroke="#f97316" strokeWidth="1.5" />
        <path d={`M${cx},${cy - r} A${r},${r} 0 0,1 ${cx},${cy + r} Z`} fill="#f97316" />
      </svg>
    );
  }

  if (status === "planned") {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <circle cx={cx} cy={cy} r={r} stroke="#eab308" strokeWidth="1.5" strokeDasharray="3.5 2" />
        <circle cx={cx} cy={cy} r="2.5" fill="#eab308" />
      </svg>
    );
  }

  // open – grey dashed outline
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx={cx} cy={cy} r={r} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3.5 2" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const AVATAR_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#22c55e",
  "#06b6d4",
  "#f59e0b",
  "#6366f1",
];

function avatarColor(userId: string) {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function UserAvatar({
  userId,
  usersMap,
}: {
  userId: string;
  usersMap: Record<string, { name: string; image: string | null }>;
}) {
  const info = usersMap[userId];
  if (info?.image) {
    return (
      <img
        src={info.image}
        alt={info.name}
        className="h-6 w-6 rounded-full object-cover shrink-0"
      />
    );
  }
  const initials = info?.name
    ? info.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";
  return (
    <div
      className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
      style={{ backgroundColor: avatarColor(userId) }}
    >
      {initials}
    </div>
  );
}

// ─── Vote Button ──────────────────────────────────────────────────────────────

function VoteButton({ post, queryKey }: { post: Post; queryKey: readonly unknown[] }) {
  const qc = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      return res.json() as Promise<{ voted: boolean }>;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKey as unknown[] });
      const prev = qc.getQueryData<{ posts: Post[] }>(queryKey as unknown[]);
      qc.setQueryData<{ posts: Post[] }>(queryKey as unknown[], (old) => {
        if (!old) return old;
        return {
          posts: old.posts.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  hasVoted: !p.hasVoted,
                  voteCount: p.hasVoted ? p.voteCount - 1 : p.voteCount + 1,
                }
              : p,
          ),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey as unknown[], ctx.prev);
    },
  });

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        mutate();
      }}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-semibold transition-colors shrink-0",
        post.hasVoted
          ? "border-primary bg-primary/10 text-primary"
          : "border-border hover:border-primary hover:text-primary text-muted-foreground",
      )}
    >
      <ChevronUp className="h-3.5 w-3.5" />
      <span>{post.voteCount}</span>
    </button>
  );
}

// ─── Post Row ─────────────────────────────────────────────────────────────────

function PostRow({
  post,
  board,
  queryKey,
  usersMap,
}: {
  post: Post;
  board: Board | undefined;
  queryKey: readonly unknown[];
  usersMap: Record<string, { name: string; image: string | null }>;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  return (
    <div className="flex items-center gap-3 px-6 py-3.5 hover:bg-muted/40 transition-colors group">
      <StatusCircleIcon status={post.status} />

      <Link
        to={`/${orgSlug}/feedback/${post.id}`}
        className="flex-1 min-w-0 flex items-center gap-2"
      >
        <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
          {post.title}
        </span>
        {board && (
          <span className="shrink-0 hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
            {board.name}
          </span>
        )}
      </Link>

      <div className="flex items-center gap-3 shrink-0">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          {post.commentCount}
        </span>

        <VoteButton post={post} queryKey={queryKey} />

        <span className="hidden sm:block text-xs text-muted-foreground w-12 text-right">
          {formatDate(post.createdAt)}
        </span>

        <UserAvatar userId={post.createdBy} usersMap={usersMap} />
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") as Status | null;
  const qc = useQueryClient();

  const queryKey = ["feedback", "all", orgSlug] as const;

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch("/api/feedback");
      return res.json() as Promise<{ posts: Post[] }>;
    },
    initialData: { posts: loaderData.posts },
    initialDataUpdatedAt: loaderData.fetchedAt,
    staleTime: 30_000,
  });

  const { data: boardsData } = useQuery({
    queryKey: ["boards", orgSlug],
    queryFn: async () => {
      const res = await fetch("/api/boards");
      return res.json() as Promise<{ boards: Board[] }>;
    },
    initialData: {
      boards: loaderData.boards,
      statusCounts: loaderData.statusCounts,
      limit: loaderData.boardsLimit,
    },
    initialDataUpdatedAt: loaderData.fetchedAt,
    staleTime: 30_000,
  });

  const boards = boardsData?.boards ?? [];
  const defaultBoard = boards.find((b) => b.isDefault) ?? boards[0];
  const boardMap = useMemo(() => Object.fromEntries(boards.map((b) => [b.id, b])), [boards]);

  const allPosts = postsData?.posts ?? [];
  const filteredPosts = useMemo(() => {
    let posts = allPosts;
    if (statusFilter) posts = posts.filter((p) => p.status === statusFilter);
    const q = searchQuery.trim().toLowerCase();
    if (q) posts = posts.filter((p) => p.title.toLowerCase().includes(q));
    return posts;
  }, [allPosts, searchQuery, statusFilter]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex-1 overflow-auto">
          {/* Page header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold tracking-tight shrink-0">Requests</h1>
            <div className="flex flex-1 items-center justify-end gap-2">
              <div className="flex items-center gap-1.5 w-80 rounded-md border bg-background px-2.5 focus-within:ring-2 focus-within:ring-primary">
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search requests…"
                  className="flex-1 py-1.5 text-sm bg-transparent focus:outline-none min-w-0"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                disabled={!defaultBoard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
              >
                <Plus className="h-4 w-4" />
                New Request
              </button>
            </div>
          </div>

          {/* Posts list */}
          {postsLoading ? (
            <div className="border-t divide-y">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-6 py-3.5">
                  <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                  <Skeleton className="h-4 flex-1 max-w-sm" />
                  <div className="flex items-center gap-3 ml-auto">
                    <Skeleton className="h-4 w-6 hidden sm:block" />
                    <Skeleton className="h-7 w-10 rounded-md" />
                    <Skeleton className="h-4 w-10 hidden sm:block" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                {searchQuery || statusFilter ? "No requests match your filters" : "No requests yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery || statusFilter
                  ? "Try adjusting your search or status filter."
                  : "Be the first to submit a feature request or bug report."}
              </p>
              {!searchQuery && !statusFilter && defaultBoard && (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Request
                </button>
              )}
            </div>
          ) : (
            <div className="border-t divide-y">
              {filteredPosts.map((post) => (
                <PostRow
                  key={post.id}
                  post={post}
                  board={boardMap[post.boardId]}
                  queryKey={queryKey}
                  usersMap={loaderData.usersMap}
                />
              ))}
            </div>
          )}
        </main>
      </SidebarInset>

      {showCreate && defaultBoard && (
        <CreateFeedbackDialog
          boardId={defaultBoard.id}
          onClose={() => setShowCreate(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["feedback", "all"] })}
        />
      )}
    </SidebarProvider>
  );
}

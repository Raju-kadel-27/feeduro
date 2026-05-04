import { AppSidebar } from "@components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { Skeleton } from "@components/ui/skeleton";
import { CollisionPriority } from "@dnd-kit/abstract";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { getEnrichedPosts } from "@lib/queries.server";
import { requireOrgBySlug } from "@lib/session.server";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eq } from "drizzle-orm";
import { ChevronUp, ExternalLink, GitBranch, Loader2, MessageSquare } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { getDb } from "@/db";
import { githubIntegrations } from "@/db/schema";
import type { Route } from "./+types/roadmap";

export function meta() {
  return [{ title: "Roadmap – Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, org } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();
  const [posts, integration] = await Promise.all([
    getEnrichedPosts(org.id, session.user.id),
    db.query.githubIntegrations.findFirst({
      where: eq(githubIntegrations.organizationId, org.id),
      columns: { repoOwner: true, repoName: true },
    }),
  ]);
  return {
    user: session.user,
    posts,
    fetchedAt: Date.now(),
    hasGithubIntegration: !!integration,
  };
}

type Status = "open" | "reviewing" | "planned" | "in-progress" | "completed" | "closed";
type Groups = Record<Status, string[]>;

interface Post {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  createdAt: string;
  voteCount: number;
  hasVoted: boolean;
  commentCount: number;
  githubIssueNumber: number | null;
  githubIssueUrl: string | null;
}

const COLUMNS: { id: Status; label: string; dot: string }[] = [
  { id: "open", label: "Open", dot: "bg-slate-400" },
  { id: "reviewing", label: "Under Review", dot: "bg-amber-400" },
  { id: "planned", label: "Planned", dot: "bg-blue-400" },
  { id: "in-progress", label: "In Progress", dot: "bg-violet-500" },
  { id: "completed", label: "Completed", dot: "bg-emerald-500" },
  { id: "closed", label: "Closed", dot: "bg-rose-400" },
];

function buildGroups(posts: Post[]): Groups {
  return COLUMNS.reduce((acc, col) => {
    acc[col.id] = posts.filter((p) => p.status === col.id).map((p) => p.id);
    return acc;
  }, {} as Groups);
}

function DraggableCard({
  post,
  index,
  column,
  hasGithubIntegration,
  onIssueCreated,
}: {
  post: Post;
  index: number;
  column: Status;
  hasGithubIntegration: boolean;
  onIssueCreated: (postId: string, issueNumber: number, issueUrl: string) => void;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const { ref, isDragging } = useSortable({
    id: post.id,
    index,
    type: "item",
    accept: ["item"],
    group: column,
  });

  const { mutate: createIssue, isPending: creatingIssue } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create_issue", postId: post.id }),
      });
      const json = (await res.json()) as {
        error?: string;
        issue?: { number: number; html_url: string };
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to create issue");
      return json.issue!;
    },
    onSuccess: (issue) => {
      toast.success(`GitHub issue #${issue.number} created`);
      onIssueCreated(post.id, issue.number, issue.html_url);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div
      ref={ref}
      onClick={() => navigate(`/${orgSlug}/feedback/${post.id}`)}
      className={cn(
        "group flex flex-col gap-3 p-3 rounded-md border border-border bg-background",
        "hover:border-border/80 hover:shadow-sm transition-all duration-100",
        "cursor-grab active:cursor-grabbing select-none",
        isDragging && "opacity-30 scale-[0.97] shadow-md",
      )}
    >
      <p className="text-xs font-medium leading-snug line-clamp-3 text-foreground group-hover:text-primary transition-colors">
        {post.title}
      </p>
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="flex items-center gap-1 text-[10px] tabular-nums">
          <ChevronUp className="h-3 w-3" />
          {post.voteCount}
        </span>
        {post.commentCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] tabular-nums">
            <MessageSquare className="h-3 w-3" />
            {post.commentCount}
          </span>
        )}

        {/* GitHub issue badge or create button */}
        <div className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {post.githubIssueNumber ? (
            <a
              href={post.githubIssueUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              title={`GitHub issue #${post.githubIssueNumber}`}
              className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground border border-border rounded px-1.5 py-0.5 hover:bg-muted/40 transition-colors"
            >
              <GitBranch className="h-2.5 w-2.5" />#{post.githubIssueNumber}
              <ExternalLink className="h-2 w-2" />
            </a>
          ) : (
            hasGithubIntegration && (
              <button
                type="button"
                disabled={creatingIssue}
                onClick={() => createIssue()}
                title="Create GitHub issue"
                className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border rounded px-1.5 py-0.5 hover:bg-muted/40 transition-all"
              >
                {creatingIssue ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : (
                  <GitBranch className="h-2.5 w-2.5" />
                )}
                {creatingIssue ? "Creating…" : "Create issue"}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({
  column,
  children,
  count,
}: {
  column: (typeof COLUMNS)[number];
  children: React.ReactNode;
  count: number;
}) {
  const { ref, isDropTarget } = useDroppable({
    id: column.id,
    type: "column",
    accept: ["item"],
    collisionPriority: CollisionPriority.Low,
  });

  return (
    <div className="flex flex-col w-[260px] shrink-0">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", column.dot)} />
        <span className="text-xs font-semibold text-foreground truncate">{column.label}</span>
        <span className="ml-auto text-[10px] font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>

      <div
        ref={ref}
        className={cn(
          "flex-1 flex flex-col gap-1.5 rounded-lg p-1.5 border transition-all duration-100",
          "min-h-[320px] overflow-y-auto",
          "[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border",
          isDropTarget
            ? "ring-2 ring-primary/30 bg-primary/5 border-primary/20"
            : "bg-muted/40 border-border/60",
        )}
      >
        {count === 0 ? (
          <div className="flex flex-1 items-center justify-center min-h-[80px]">
            <p className="text-[10px] text-muted-foreground/30 select-none">Empty</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function KanbanBoard({
  posts,
  onStatusChange,
  hasGithubIntegration,
  onIssueCreated,
}: {
  posts: Post[];
  onStatusChange: (id: string, status: Status) => void;
  hasGithubIntegration: boolean;
  onIssueCreated: (postId: string, issueNumber: number, issueUrl: string) => void;
}) {
  const [groups, setGroups] = useState<Groups>(() => buildGroups(posts));
  const previousGroups = useRef(groups);
  const latestGroups = useRef(groups);
  const activeDrag = useRef(false);

  const postMap = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);

  useEffect(() => {
    if (!activeDrag.current) {
      const g = buildGroups(posts);
      setGroups(g);
      latestGroups.current = g;
    }
  }, [posts]);

  return (
    <DragDropProvider
      onDragStart={() => {
        activeDrag.current = true;
        previousGroups.current = structuredClone(groups);
      }}
      onDragOver={(event) => {
        setGroups((g) => {
          const next = move(g, event) as Groups;
          latestGroups.current = next;
          return next;
        });
      }}
      onDragEnd={(event) => {
        activeDrag.current = false;

        if (event.canceled) {
          setGroups(previousGroups.current);
          latestGroups.current = previousGroups.current;
          return;
        }

        const prev = previousGroups.current;
        const curr = latestGroups.current;
        for (const { id: status } of COLUMNS) {
          for (const itemId of curr[status]) {
            if (!prev[status].includes(itemId)) {
              onStatusChange(itemId, status);
            }
          }
        }
      }}
    >
      <div className="flex gap-3 h-full pb-2">
        {COLUMNS.map((col) => {
          const colPosts = (groups[col.id] ?? [])
            .map((id) => postMap.get(id))
            .filter((p): p is Post => p !== undefined);

          return (
            <DroppableColumn key={col.id} column={col} count={colPosts.length}>
              {colPosts.map((post, index) => (
                <DraggableCard
                  key={post.id}
                  post={post}
                  index={index}
                  column={col.id}
                  hasGithubIntegration={hasGithubIntegration}
                  onIssueCreated={onIssueCreated}
                />
              ))}
            </DroppableColumn>
          );
        })}
      </div>
    </DragDropProvider>
  );
}

function ColumnSkeleton() {
  return (
    <div className="flex gap-3 h-full">
      {COLUMNS.map((col, ci) => (
        <div key={col.id} className="flex flex-col w-[260px] shrink-0">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", col.dot)} />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="ml-auto h-3 w-4" />
          </div>
          <div className="flex-1 rounded-lg border border-border/60 bg-muted/40 p-1.5 min-h-[320px] space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-md p-3 space-y-2.5 bg-background border border-border"
                style={{ animationDelay: `${(ci * 3 + i) * 60}ms` }}
              >
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-3/5" />
                <div className="flex items-center gap-2 pt-0.5">
                  <Skeleton className="h-3 w-6" />
                  <Skeleton className="h-3 w-5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Roadmap({ loaderData }: Route.ComponentProps) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["roadmap"],
    queryFn: async () => {
      const res = await fetch("/api/feedback");
      return res.json() as Promise<{ posts: Post[] }>;
    },
    initialData: { posts: loaderData.posts as Post[] },
    initialDataUpdatedAt: loaderData.fetchedAt,
    staleTime: 30_000,
  });

  function handleIssueCreated(postId: string, issueNumber: number, issueUrl: string) {
    qc.setQueryData<{ posts: Post[] }>(["roadmap"], (old) => {
      if (!old) return old;
      return {
        posts: old.posts.map((p) =>
          p.id === postId ? { ...p, githubIssueNumber: issueNumber, githubIssueUrl: issueUrl } : p,
        ),
      };
    });
  }

  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "update_status", id, status }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? "Failed");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roadmap"] }),
    onError: (err) => {
      qc.invalidateQueries({ queryKey: ["roadmap"] });
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    },
  });

  const posts = data?.posts ?? [];
  const total = posts.length;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">
            {loaderData.user.name ?? loaderData.user.email}
          </span>
        </header>

        <div className="flex flex-col h-[calc(100svh-3.5rem)] overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4 shrink-0 border-b">
            <h1 className="text-base font-semibold">Roadmap</h1>
            {!isLoading && total > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {total} {total === 1 ? "item" : "items"}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-5">
            {isLoading ? (
              <ColumnSkeleton />
            ) : (
              <KanbanBoard
                posts={posts}
                onStatusChange={(id, status) => updateStatus({ id, status })}
                hasGithubIntegration={loaderData.hasGithubIntegration}
                onIssueCreated={handleIssueCreated}
              />
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

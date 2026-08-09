import { useInfiniteQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Circle,
  CircleDot,
  CircleOff,
  Clock,
  Eye,
  LinkIcon,
  Loader2,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const PAGE_SIZE = 15;

interface Post { id: string; title: string; status: string }

interface Props {
  changelogId: string;
  initialLinked: Post[];
}

async function mutate(intent: string, changelogId: string, postId: string) {
  const res = await fetch("/api/changelog-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent, changelogId, postId }),
  });
  if (!res.ok) throw new Error("Request failed");
}

const STATUS_CONFIG: Record<string, { icon: LucideIcon; badge: string; iconClass: string }> = {
  open:          { icon: Circle,       badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",    iconClass: "text-slate-400" },
  reviewing:     { icon: Eye,          badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",    iconClass: "text-amber-500" },
  planned:       { icon: Clock,        badge: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400", iconClass: "text-purple-500" },
  "in-progress": { icon: CircleDot,    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",        iconClass: "text-blue-500" },
  completed:     { icon: CheckCircle2, badge: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",    iconClass: "text-green-500" },
  closed:        { icon: CircleOff,    badge: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",    iconClass: "text-slate-400" },
};

const FALLBACK = STATUS_CONFIG.open;

function formatStatus(status: string) {
  return status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ChangelogRequestsPanel({ changelogId, initialLinked }: Props) {
  const [linked, setLinked] = useState<Post[]>(initialLinked);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const linkedIds = useMemo(() => new Set(linked.map((p) => p.id)), [linked]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["changelog-posts-picker", changelogId, debouncedSearch],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ offset: String(pageParam) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/changelog-requests?${params}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json() as Promise<{ posts: Post[]; hasMore: boolean }>;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length * PAGE_SIZE : undefined,
    enabled: pickerOpen,
  });

  const posts = useMemo(
    () => data?.pages.flatMap((p) => p.posts).filter((p) => !linkedIds.has(p.id)) ?? [],
    [data, linkedIds],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  function closePicker() {
    setPickerOpen(false);
    setSearch("");
    setDebouncedSearch("");
  }

  async function add(post: Post) {
    setBusy(post.id);
    try {
      await mutate("add-request", changelogId, post.id);
      setLinked((prev) => [...prev, post]);
    } catch {
      toast.error("Failed to link request");
    } finally {
      setBusy(null);
    }
  }

  async function remove(post: Post) {
    setBusy(post.id);
    try {
      await mutate("remove-request", changelogId, post.id);
      setLinked((prev) => prev.filter((p) => p.id !== post.id));
    } catch {
      toast.error("Failed to unlink request");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2.5">
        <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Linked Requests</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {linked.length === 0 && !pickerOpen && (
          <span className="text-xs text-muted-foreground italic">No linked requests</span>
        )}
        {linked.map((post) => {
          const cfg = STATUS_CONFIG[post.status] ?? FALLBACK;
          const Icon = cfg.icon;
          return (
            <div key={post.id} className="flex items-start justify-between gap-1.5">
              <div className="flex items-start gap-1.5 min-w-0">
                <span className={`mt-0.5 shrink-0 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${cfg.badge}`}>
                  <Icon className="h-2.5 w-2.5" />
                  {formatStatus(post.status)}
                </span>
                <span className="text-xs leading-5 line-clamp-2">{post.title}</span>
              </div>
              <button
                type="button"
                disabled={busy === post.id}
                onClick={() => remove(post)}
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                aria-label="Unlink request"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}

        {pickerOpen ? (
          <div className="flex flex-col gap-1 mt-1">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requests…"
              className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              onKeyDown={(e) => e.key === "Escape" && closePicker()}
            />
            <div className="max-h-44 overflow-y-auto rounded-lg border bg-popover shadow-sm">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : posts.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>
              ) : (
                <>
                  {posts.map((post) => {
                    const cfg = STATUS_CONFIG[post.status] ?? FALLBACK;
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={post.id}
                        type="button"
                        disabled={busy === post.id}
                        onClick={() => add(post)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors disabled:opacity-40"
                      >
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${cfg.iconClass}`} />
                        <span className="truncate">{post.title}</span>
                      </button>
                    );
                  })}
                  <div ref={sentinelRef} className="flex items-center justify-center py-1">
                    {isFetchingNextPage && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={closePicker}
              className="text-xs font-medium text-rose-500 hover:text-rose-700 self-start transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-dashed text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors self-start"
          >
            + Link request
          </button>
        )}
      </div>
    </div>
  );
}

import { RouteErrorMessage } from "@components/common/route-error";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog";
import { SidebarTrigger } from "@components/ui/sidebar";
import { Skeleton } from "@components/ui/skeleton";
import { Spinner } from "@components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/ui/tooltip";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { ChangelogSearchInput } from "@features/changelog/components/changelog-search-input";
import { useInfiniteScroll } from "@hooks/use-infinite-scroll";
import { cn } from "@lib/utils";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, FileText, Globe, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useOutlet, useParams } from "react-router";
import { toast } from "sonner";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/index";

export function meta() {
  return [{ title: "Changelog – Feeduro" }];
}

export function shouldRevalidate() {
  return false;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  await requireOrgBySlug(db, request, params.orgSlug);
  return {};
}

export function ErrorBoundary() {
  return <RouteErrorMessage resource="the changelog" />;
}

type ChangelogEntry = {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  excerpt: string;
};

type PageResult = {
  changelogs: ChangelogEntry[];
  nextCursor: string | null;
  hasMore: boolean;
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  published: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ChangelogEntriesSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border px-4 py-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-14 rounded" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChangelogContent() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["changelogs", debouncedSearch],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "20" });
      if (pageParam) params.set("cursor", pageParam);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/changelogs?${params}`);
      return res.json() as Promise<PageResult>;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
  });

  const { mutate: deleteEntry, isPending: deleting } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/changelogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "delete", id }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? "Failed to delete");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["changelogs"] });
      toast.success("Changelog deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    },
  });

  const entries = data?.pages.flatMap((p) => p.changelogs) ?? [];

  const sentinelRef = useInfiniteScroll(
    () => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); },
    { enabled: !!hasNextPage && !isFetchingNextPage },
  );

  return (
    <>
      <main className="p-6 max-w-3xl mx-auto w-full">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">Changelog</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Announce new features and updates to your customers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ChangelogSearchInput value={search} onChange={setSearch} size="md" className="w-56" />
            <Link
              to={`/${orgSlug}/changelog/new`}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Entry
            </Link>
          </div>
        </div>

        {isLoading ? (
          <ChangelogEntriesSkeleton />
        ) : entries.length === 0 && !debouncedSearch ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No changelog entries yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first entry to start announcing updates.
            </p>
            <Link
              to={`/${orgSlug}/changelog/new`}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Entry
            </Link>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No entries match your search</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different keyword.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/${orgSlug}/changelog/${entry.id}`)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-medium truncate">{entry.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                        STATUS_BADGE[entry.status],
                      )}
                    >
                      {entry.status === "published" ? (
                        <Globe className="h-2.5 w-2.5" />
                      ) : (
                        <Clock className="h-2.5 w-2.5" />
                      )}
                      {entry.status === "published" ? "Published" : "Draft"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {entry.publishedAt
                        ? formatDate(entry.publishedAt)
                        : `Updated ${formatDate(entry.updatedAt)}`}
                    </span>
                  </div>
                  {entry.excerpt && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{entry.excerpt}</p>
                  )}
                </button>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(entry.id)}
                        disabled={deleting}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all text-muted-foreground disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Delete entry</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ))}
            <div ref={sentinelRef} />
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Spinner className="size-4" />
              </div>
            )}
          </div>
        )}
      </main>

      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete changelog entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The entry will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteId) deleteEntry(pendingDeleteId);
                setPendingDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function Changelog() {
  const outlet = useOutlet();
  if (outlet) return <>{outlet}</>;
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <ChangelogContent />
    </>
  );
}

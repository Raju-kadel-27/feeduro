import { SidebarTrigger } from "@components/ui/sidebar";
import { Skeleton } from "@components/ui/skeleton";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { desc, eq } from "drizzle-orm";
import { Clock, FileText, Globe, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate, useOutlet, useParams } from "react-router";
import { toast } from "sonner";
import { getDb } from "@/db";
import { changelogs as changelogsTable } from "@/db/schema";

import type { Route } from "./+types/index";

export function meta() {
  return [{ title: "Changelog – Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, org } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const entries = await db.query.changelogs.findMany({
    where: eq(changelogsTable.organizationId, org.id),
    orderBy: [desc(changelogsTable.createdAt)],
    columns: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      body: true,
    },
  });

  return { user: session.user, changelogs: entries, fetchedAt: Date.now() };
}

interface ChangelogEntry {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  published: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ChangelogList({
  userName,
  initialChangelogs,
  fetchedAt,
}: {
  userName: string;
  initialChangelogs: ChangelogEntry[];
  fetchedAt: number;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["changelogs"],
    queryFn: async () => {
      const res = await fetch("/api/changelogs");
      return res.json() as Promise<{ changelogs: ChangelogEntry[] }>;
    },
    initialData: { changelogs: initialChangelogs },
    initialDataUpdatedAt: fetchedAt,
    staleTime: 30_000,
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

  const entries = data?.changelogs ?? [];

  return (
        <>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">{userName}</span>
        </header>

        <main className="p-6 max-w-3xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold">Changelog</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Announce new features and updates to your customers.
              </p>
            </div>
            <Link
              to={`/${orgSlug}/changelog/new`}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Entry
            </Link>
          </div>

          {isLoading ? (
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
          ) : entries.length === 0 ? (
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
                    {entry.body &&
                      (() => {
                        try {
                          const blocks = JSON.parse(entry.body);
                          const text = Array.isArray(blocks)
                            ? blocks
                                .filter((b) => b?.type === "paragraph" || b?.type === "heading")
                                .flatMap((b) =>
                                  Array.isArray(b.content)
                                    ? b.content
                                        .filter(
                                          (c: { type: string; text?: string }) => c.type === "text",
                                        )
                                        .map((c: { type: string; text?: string }) => c.text)
                                        .join("")
                                    : [],
                                )
                                .join(" ")
                                .slice(0, 160)
                            : "";
                          return text ? (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{text}</p>
                          ) : null;
                        } catch {
                          return null;
                        }
                      })()}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteEntry(entry.id)}
                    disabled={deleting}
                    title="Delete entry"
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all text-muted-foreground disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
        </>
  );
}

export default function Changelog({ loaderData }: Route.ComponentProps) {
  const outlet = useOutlet();
  if (outlet) return <>{outlet}</>;
  return (
    <ChangelogList
      userName={loaderData.user.name ?? loaderData.user.email}
      initialChangelogs={loaderData.changelogs}
      fetchedAt={loaderData.fetchedAt}
    />
  );
}

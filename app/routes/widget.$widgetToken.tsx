import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { useEffect, useState } from "react";
import { data } from "react-router";
import { getDb } from "@/db";
import {
  comments,
  feedbackBoards,
  feedbackPosts,
  organization,
  votes,
  widgetConfigs,
} from "@/db/schema";
import type { Route } from "./+types/widget.$widgetToken";

export function headers() {
  return {
    // Allow this page to be embedded in any iframe
    "Content-Security-Policy": "frame-ancestors *",
  };
}

const STATUS = {
  pending: { label: "Pending", color: "#f59e0b" },
  reviewing: { label: "Reviewing", color: "#f97316" },
  planned: { label: "Planned", color: "#3b82f6" },
  inprogress: { label: "In Progress", color: "#a855f7" },
  completed: { label: "Completed", color: "#22c55e" },
  closed: { label: "Closed", color: "#6b7280" },
} as const;

type StatusKey = keyof typeof STATUS;

function toStatusKey(dbStatus: string): StatusKey {
  const map: Record<string, StatusKey> = {
    open: "pending",
    reviewing: "reviewing",
    planned: "planned",
    "in-progress": "inprogress",
    completed: "completed",
    closed: "closed",
  };
  return map[dbStatus] ?? "pending";
}

interface WidgetPost {
  id: string;
  title: string;
  status: StatusKey;
  voteCount: number;
  commentCount: number;
}

export async function loader({ params }: Route.LoaderArgs) {
  const db = getDb();

  const config = await db.query.widgetConfigs.findFirst({
    where: eq(widgetConfigs.token, params.widgetToken),
  });

  if (!config || !config.enabled) {
    throw new Response("Not found", { status: 404 });
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, config.organizationId),
  });
  if (!org) throw new Response("Not found", { status: 404 });

  // Resolve which board to show: configured > default > first public
  let board = config.boardId
    ? await db.query.feedbackBoards.findFirst({
        where: and(
          eq(feedbackBoards.id, config.boardId),
          eq(feedbackBoards.organizationId, org.id),
          eq(feedbackBoards.visibility, "public"),
        ),
      })
    : undefined;

  if (!board) {
    board =
      (await db.query.feedbackBoards.findFirst({
        where: and(
          eq(feedbackBoards.organizationId, org.id),
          eq(feedbackBoards.visibility, "public"),
          eq(feedbackBoards.isDefault, true),
        ),
      })) ??
      (await db.query.feedbackBoards.findFirst({
        where: and(
          eq(feedbackBoards.organizationId, org.id),
          eq(feedbackBoards.visibility, "public"),
        ),
        orderBy: [desc(feedbackBoards.createdAt)],
      }));
  }

  if (!board) {
    return data({
      token: params.widgetToken,
      org: { name: org.name ?? "", slug: org.slug ?? "" },
      board: null,
      posts: [] as WidgetPost[],
      theme: config.theme,
    });
  }

  const rawPosts = await db.query.feedbackPosts.findMany({
    where: and(eq(feedbackPosts.boardId, board.id), eq(feedbackPosts.organizationId, org.id)),
    orderBy: [desc(feedbackPosts.createdAt)],
    limit: 50,
  });

  const postIds = rawPosts.map((p) => p.id);

  const [allVotes, commentCountRows] = await Promise.all([
    postIds.length > 0
      ? db.query.votes.findMany({ where: inArray(votes.postId, postIds) })
      : Promise.resolve([]),
    postIds.length > 0
      ? db
          .select({
            postId: comments.postId,
            count: sql<number>`count(*)`.mapWith(Number),
          })
          .from(comments)
          .where(inArray(comments.postId, postIds))
          .groupBy(comments.postId)
      : Promise.resolve([]),
  ]);

  const commentCountMap = Object.fromEntries(commentCountRows.map((r) => [r.postId, r.count]));

  const posts: WidgetPost[] = rawPosts.map((post) => ({
    id: post.id,
    title: post.title,
    status: toStatusKey(post.status),
    voteCount: allVotes.filter((v) => v.postId === post.id).length,
    commentCount: commentCountMap[post.id] ?? 0,
  }));

  return data({
    token: params.widgetToken,
    org: { name: org.name ?? "", slug: org.slug ?? "" },
    board: { id: board.id, name: board.name },
    posts,
    theme: config.theme,
  });
}

// ─── Status Pill ──────────────────────────────────────────────────────────────

function StatusPill({ id }: { id: StatusKey }) {
  const s = STATUS[id];
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] border border-border/60 text-foreground/60">
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface IdentityPayload {
  id: string;
  email?: string;
  name?: string;
  signature?: string;
}

export default function WidgetPage({ loaderData }: Route.ComponentProps) {
  const { token, org, board, posts, theme } = loaderData;

  const [view, setView] = useState<"feed" | "submit">("feed");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPosts, setLocalPosts] = useState<WidgetPost[]>([]);
  const [identity, setIdentity] = useState<IdentityPayload | null>(null);

  // Apply the configured theme, overriding the system default from ThemeProvider
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    }
    // "auto" → system media query handles it via ThemeProvider
  }, [theme]);

  // Accept identity data from parent page via postMessage
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "fdy:identify" && e.data?.data) {
        setIdentity(e.data.data as IdentityPayload);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !board) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/public-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgetToken: token,
          orgSlug: org.slug,
          boardId: board.id,
          title: title.trim(),
          description: description.trim() || undefined,
          submitter: identity ?? undefined,
        }),
      });
      const json = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      setLocalPosts((prev) => [
        {
          id: json.id ?? Date.now().toString(),
          title: title.trim(),
          status: "pending",
          voteCount: 0,
          commentCount: 0,
        },
        ...prev,
      ]);
      setSubmitted(true);
      setTitle("");
      setDescription("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function openSubmit() {
    setView("submit");
    setSubmitted(false);
    setError(null);
  }

  const allPosts = [...localPosts, ...posts];

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-border/70 shrink-0 bg-background/95 backdrop-blur">
        {view === "feed" ? (
          <>
            <span className="font-semibold text-[13px] truncate leading-none">{org.name}</span>
            {board && (
              <button
                onClick={openSubmit}
                className="shrink-0 ml-2 px-3 h-7 rounded-full bg-primary text-primary-foreground text-[11.5px] font-medium hover:bg-primary/90 transition-colors"
              >
                + Give Feedback
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => setView("feed")}
              className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <span className="font-semibold text-[13px]">Give Feedback</span>
            <div className="w-14" />
          </>
        )}
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        {view === "feed" ? (
          <>
            {allPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-1 text-muted-foreground">
                <p className="text-[13px]">No feedback yet.</p>
                <p className="text-[12px] opacity-70">Be the first to share!</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {allPosts.map((post) => (
                  <li key={post.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[13px] font-medium leading-snug line-clamp-2 flex-1">
                        {post.title}
                      </p>
                      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums mt-px">
                        ▲ {post.voteCount}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <StatusPill id={post.status} />
                      {post.commentCount > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="p-4">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <div className="text-3xl">🎉</div>
                <p className="font-semibold text-[14px] mt-1">Thank you!</p>
                <p className="text-[12px] text-muted-foreground">Your feedback was submitted.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setView("feed");
                  }}
                  className="mt-4 text-[12px] text-primary hover:underline underline-offset-2 transition-colors"
                >
                  Back to feedback
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    Title <span className="text-destructive">*</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="A short, clear summary"
                    autoFocus
                    required
                    className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-[13px] outline-none focus:border-primary placeholder:text-muted-foreground transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    Details <span className="normal-case opacity-60">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    placeholder="What happened? What did you expect?"
                    className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-[13px] outline-none focus:border-primary placeholder:text-muted-foreground resize-none transition-colors"
                  />
                </div>
                {error && <p className="text-[12px] text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting || !title.trim()}
                  className="w-full h-9 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Submitting…" : "Submit Feedback"}
                </button>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="shrink-0 flex items-center justify-center h-8 border-t border-border/40 bg-background/80">
        <a
          href="https://feediyo.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          Powered by Feediyo
        </a>
      </footer>
    </div>
  );
}

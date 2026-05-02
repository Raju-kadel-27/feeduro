import { GoogleIcon } from "@components/icons/google";
import { AccountModal } from "@components/layout/account-modal";
import { useTheme } from "@components/providers/theme-provider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@components/ui/sheet";
import { authClient } from "@lib/auth/client";
import { validateClientToken } from "@lib/feediyo-auth.server";
import { getSession } from "@lib/session.server";
import { cn } from "@lib/utils";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  ArrowUp,
  ChevronRight,
  Globe,
  Link2,
  Loader2,
  LogOut,
  Megaphone,
  MessageSquare,
  Monitor,
  Moon,
  Palette,
  Search,
  Settings,
  Share2,
  Sun,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { data, Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { getDb } from "@/db";
import {
  changelogs as changelogsTable,
  comments,
  feedbackBoards,
  feedbackPosts,
  organization,
  user as userTable,
  votes,
  widgetConfigs,
} from "@/db/schema";
import type { Route } from "./+types/public.$orgSlug";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS = {
  pending: { label: "Pending", fg: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
  reviewing: { label: "Under Review", fg: "#475569", bg: "#f1f5f9", dot: "#94a3b8" },
  planned: { label: "Planned", fg: "#1d4ed8", bg: "#dbeafe", dot: "#3b82f6" },
  inprogress: { label: "In Progress", fg: "#b45309", bg: "#fef3c7", dot: "#f59e0b" },
  completed: { label: "Shipped", fg: "#047857", bg: "#d1fae5", dot: "#10b981" },
  closed: { label: "Closed", fg: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicPost {
  id: string;
  title: string;
  description: string | null;
  status: StatusKey;
  boardId: string;
  boardName: string;
  authorName: string;
  voteCount: number;
  commentCount: number;
}

interface PublicBoard {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
}

interface SessionUser {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
}

type PublicTab = "feedback" | "roadmap" | "updates";

interface PublicChangelog {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  excerpt: string;
  authorName: string;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ request, params }: Route.LoaderArgs) {
  const db = getDb();

  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, params.orgSlug),
  });
  if (!org) throw new Response("Not found", { status: 404 });

  // Set by entry.worker.ts when the request arrived via a verified custom domain
  const customDomain = request.headers.get("x-custom-domain") ?? null;

  // Cookie-based Better Auth session (regular login)
  const session = await getSession(request);
  const sessionUser: SessionUser | null = session
    ? {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email,
        image: session.user.image ?? null,
      }
    : null;

  // Automatic login — validate the _fdy clientToken if present
  const url = new URL(request.url);
  const fdyToken = url.searchParams.get("_fdy");
  let publicUser: { id: string; email: string; name?: string } | null = null;
  let widgetToken: string | null = null;

  const widgetConfig = await db.query.widgetConfigs.findFirst({
    where: eq(widgetConfigs.organizationId, org.id),
    columns: { signingSecret: true, token: true },
  });

  if (widgetConfig) {
    widgetToken = widgetConfig.token;
    if (fdyToken && widgetConfig.signingSecret) {
      publicUser = await validateClientToken(fdyToken, widgetConfig.signingSecret);
    }
  }

  const boards = await db.query.feedbackBoards.findMany({
    where: and(eq(feedbackBoards.organizationId, org.id), eq(feedbackBoards.visibility, "public")),
    orderBy: [desc(feedbackBoards.isDefault), desc(feedbackBoards.createdAt)],
  });

  const boardIds = boards.map((b) => b.id);
  const boardMap = Object.fromEntries(boards.map((b) => [b.id, b.name]));

  const publicBoards: PublicBoard[] = boards.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    isDefault: b.isDefault,
  }));

  if (boardIds.length === 0) {
    return data({
      org: { id: org.id, name: org.name ?? "", slug: org.slug ?? "" },
      boards: publicBoards,
      posts: [] as PublicPost[],
      changelogEntries: [] as PublicChangelog[],
      upNextPosts: [] as { id: string; title: string; voteCount: number }[],
      votedPostIds: [] as string[],
      sessionUser,
      publicUser,
      widgetToken,
    });
  }

  const rawPosts = await db.query.feedbackPosts.findMany({
    where: and(eq(feedbackPosts.organizationId, org.id), inArray(feedbackPosts.boardId, boardIds)),
    orderBy: [desc(feedbackPosts.createdAt)],
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

  const uniqueUserIds = [
    ...new Set(rawPosts.map((p) => p.createdBy).filter((id) => id !== "public")),
  ];
  const users =
    uniqueUserIds.length > 0
      ? await db.query.user.findMany({
          where: inArray(userTable.id, uniqueUserIds),
          columns: { id: true, name: true },
        })
      : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const commentCountMap = Object.fromEntries(commentCountRows.map((r) => [r.postId, r.count]));

  const posts: PublicPost[] = rawPosts.map((post) => ({
    id: post.id,
    title: post.title,
    description: post.description ?? null,
    status: toStatusKey(post.status),
    boardId: post.boardId,
    boardName: boardMap[post.boardId] ?? "",
    authorName:
      post.createdBy === "public" ? "Anonymous" : (userMap[post.createdBy] ?? "Anonymous"),
    voteCount: allVotes.filter((v) => v.postId === post.id).length,
    commentCount: commentCountMap[post.id] ?? 0,
  }));

  // Published changelogs for the Updates tab
  const rawChangelogs = await db.query.changelogs.findMany({
    where: and(eq(changelogsTable.organizationId, org.id), eq(changelogsTable.status, "published")),
    orderBy: [desc(changelogsTable.publishedAt)],
    columns: { id: true, title: true, slug: true, body: true, publishedAt: true, createdBy: true },
  });

  const changelogUserIds = [...new Set(rawChangelogs.map((c) => c.createdBy).filter(Boolean))];
  const changelogUsers =
    changelogUserIds.length > 0
      ? await db.query.user.findMany({
          where: inArray(userTable.id, changelogUserIds),
          columns: { id: true, name: true },
        })
      : [];
  const changelogUserMap = Object.fromEntries(changelogUsers.map((u) => [u.id, u.name]));

  const changelogEntries: PublicChangelog[] = rawChangelogs.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    publishedAt: c.publishedAt?.toISOString() ?? c.id,
    excerpt: extractBlockNoteText(c.body, 200),
    authorName: changelogUserMap[c.createdBy] ?? "Team",
  }));

  // Top 3 "up next" planned posts for sidebar
  const upNextPosts = posts
    .filter((p) => p.status === "planned")
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, 3)
    .map((p) => ({ id: p.id, title: p.title, voteCount: p.voteCount }));

  const votedPostIds = sessionUser
    ? allVotes.filter((v) => v.userId === sessionUser.id).map((v) => v.postId)
    : [];

  return data({
    org: { id: org.id, name: org.name ?? "", slug: org.slug ?? "" },
    boards: publicBoards,
    posts,
    changelogEntries,
    upNextPosts,
    votedPostIds,
    customDomain,
    sessionUser,
    publicUser,
    widgetToken,
  });
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Feedback Board" }];

  const canonical = (loaderData as any).customDomain
    ? `https://${(loaderData as any).customDomain}/`
    : `https://${loaderData.org.slug}.feediyo.com/`;

  return [
    { title: `${loaderData.org.name} – Feedback` },
    { name: "description", content: `Share your feedback and ideas for ${loaderData.org.name}.` },
    { tagName: "link", rel: "canonical", href: canonical },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractBlockNoteText(body: string, maxLen = 200): string {
  try {
    const blocks = JSON.parse(body) as Array<{
      type: string;
      content?: Array<{ type: string; text?: string }>;
      children?: unknown[];
    }>;
    const parts: string[] = [];
    function walk(nodes: typeof blocks) {
      for (const b of nodes) {
        if (b.content) {
          for (const c of b.content) {
            if (c.type === "text" && c.text) parts.push(c.text);
          }
        }
      }
    }
    walk(blocks);
    const text = parts.join(" ").trim();
    return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
  } catch {
    return "";
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = ["#7c3aed", "#2563eb", "#db2777", "#059669", "#d97706", "#0891b2"];
function avatarColor(name: string): string {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const idx = hash % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx]!;
}

const BOARD_COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f97316", "#ef4444", "#06b6d4"];

// ─── Sub-components ───────────────────────────────────────────────────────────

// ─── Public auth modal (sign-in / sign-up without leaving the page) ───────────

type AuthTab = "sign-in" | "sign-up";

function PublicAuthModal({
  initialTab = "sign-in",
  onClose,
  onSuccess,
}: {
  initialTab?: AuthTab;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setError("");
    setName("");
    setEmail("");
    setPassword("");
  }

  function switchTab(t: AuthTab) {
    reset();
    setTab(t);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await authClient.signIn.email({
      email,
      password,
      fetchOptions: {
        onError(ctx) {
          setError(ctx.error.message ?? "Invalid email or password");
          setLoading(false);
        },
        onSuccess() {
          onSuccess();
        },
      },
    });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await authClient.signUp.email({
      name,
      email,
      password,
      fetchOptions: {
        onError(ctx) {
          setError(ctx.error.message ?? "Could not create account");
          setLoading(false);
        },
        onSuccess() {
          onSuccess();
        },
      },
    });
  }

  async function handleGoogle() {
    setLoading(true);
    setError("");
    const callbackURL = window.location.href;
    const { error: oauthError } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
    });
    if (oauthError) {
      setError(oauthError.message ?? "Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[420px] max-w-[92vw] rounded-xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              onClick={() => switchTab("sign-in")}
              className={cn(
                "px-4 h-7 rounded-md text-[12.5px] font-medium transition-colors",
                tab === "sign-in"
                  ? "bg-background text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Sign in
            </button>
            <button
              onClick={() => switchTab("sign-up")}
              className={cn(
                "px-4 h-7 rounded-md text-[12.5px] font-medium transition-colors",
                tab === "sign-up"
                  ? "bg-background text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Sign up
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full h-9 rounded-md border border-border bg-background flex items-center justify-center gap-2 text-[13px] font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground">or continue with email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Form */}
        <form onSubmit={tab === "sign-in" ? handleSignIn : handleSignUp} className="space-y-3">
          {tab === "sign-up" && (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Full name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                required
                autoComplete="name"
                className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-[13px] outline-none focus:border-primary placeholder:text-muted-foreground"
              />
            </div>
          )}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-[13px] outline-none focus:border-primary placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === "sign-up" ? "Min 8 characters" : "Your password"}
              required
              minLength={tab === "sign-up" ? 8 : undefined}
              autoComplete={tab === "sign-in" ? "current-password" : "new-password"}
              className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-[13px] outline-none focus:border-primary placeholder:text-muted-foreground"
            />
          </div>

          {error && (
            <p className="text-[12.5px] text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {tab === "sign-in" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-[11.5px] text-muted-foreground">
          {tab === "sign-in" ? (
            <>
              No account?{" "}
              <button
                onClick={() => switchTab("sign-up")}
                className="underline underline-offset-4 hover:text-foreground"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => switchTab("sign-in")}
                className="underline underline-offset-4 hover:text-foreground"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

type AccountTab = "profile" | "appearance" | "settings";
type ThemeValue = "light" | "dark" | "system";

const THEME_OPTIONS: { value: ThemeValue; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function UserMenu({ user, onSubmitPost }: { user: SessionUser; onSubmitPost: () => void }) {
  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [accountModal, setAccountModal] = useState<AccountTab | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setThemeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleClose = useCallback(() => setAccountModal(null), []);

  async function handleLogout() {
    await authClient.signOut();
    window.location.reload();
  }

  const displayName = user.name ?? user.email;

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => {
            setOpen((v) => !v);
            setThemeOpen(false);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-transparent hover:ring-border transition-all"
          aria-label="User menu"
        >
          {user.image ? (
            <img src={user.image} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white"
              style={{ background: avatarColor(displayName) }}
            >
              {getInitials(displayName)}
            </div>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-popover shadow-xl z-50 py-1.5 overflow-hidden">
            {/* User header */}
            <div className="px-3 py-2.5 border-b border-border mb-1">
              <p className="text-[13px] font-semibold truncate">{displayName}</p>
              <p className="text-[11.5px] text-muted-foreground truncate">{user.email}</p>
            </div>

            {/* Submit a Post */}
            <button
              onClick={() => {
                setOpen(false);
                onSubmitPost();
              }}
              className="w-full flex items-center gap-2.5 px-3 h-9 text-[13px] text-foreground/85 hover:bg-muted/60 hover:text-foreground transition-colors"
            >
              <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
              Submit a Post
            </button>

            {/* Profile */}
            <button
              onClick={() => {
                setOpen(false);
                setAccountModal("profile");
              }}
              className="w-full flex items-center gap-2.5 px-3 h-9 text-[13px] text-foreground/85 hover:bg-muted/60 hover:text-foreground transition-colors"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Profile
            </button>

            {/* Settings */}
            <button
              onClick={() => {
                setOpen(false);
                setAccountModal("settings");
              }}
              className="w-full flex items-center gap-2.5 px-3 h-9 text-[13px] text-foreground/85 hover:bg-muted/60 hover:text-foreground transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              Settings
            </button>

            <div className="my-1 border-t border-border" />

            {/* Theme submenu */}
            <div className="relative">
              <button
                onClick={() => setThemeOpen((v) => !v)}
                className="w-full flex items-center gap-2.5 px-3 h-9 text-[13px] text-foreground/85 hover:bg-muted/60 hover:text-foreground transition-colors"
              >
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 text-left">Theme</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {themeOpen && (
                <div className="absolute right-full top-0 mr-1 w-36 rounded-lg border border-border bg-popover shadow-lg py-1 z-50">
                  {THEME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setTheme(opt.value);
                        setThemeOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 h-8 text-[12.5px] transition-colors",
                        theme === opt.value
                          ? "text-foreground font-medium bg-muted"
                          : "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <opt.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Language (placeholder) */}
            <button className="w-full flex items-center gap-2.5 px-3 h-9 text-[13px] text-foreground/85 hover:bg-muted/60 hover:text-foreground transition-colors">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 text-left">Language</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            <div className="my-1 border-t border-border" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 h-9 text-[13px] text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        )}
      </div>

      {accountModal && (
        <AccountModal
          user={{ name: user.name ?? "", email: user.email, image: user.image }}
          initialTab={accountModal}
          onClose={handleClose}
        />
      )}
    </>
  );
}

function TopNav({
  orgName,
  sessionUser,
  currentTab,
  onSubmitPost,
  onSignIn,
  onSignUp,
}: {
  orgName: string;
  sessionUser: SessionUser | null;
  currentTab: PublicTab;
  onSubmitPost: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border/60">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center px-6">
        {/* Logo — fixed width matches sidebar (280px) + gap (40px) */}
        <div className="w-[520px] shrink-0 flex items-center">
          <a href="/" className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background text-[12px] font-bold">
              {orgName[0]?.toUpperCase() ?? "?"}
            </span>
            <span className="text-[14px] font-semibold tracking-tight">{orgName}</span>
          </a>
        </div>

        {/* Tabs — aligned with the feed content */}
        <nav className="flex flex-1 items-center gap-1">
          {(["feedback", "roadmap", "updates"] as const).map((tab) => (
            <Link
              key={tab}
              to={tab === "feedback" ? "?" : `?tab=${tab}`}
              className={cn(
                "relative px-3 h-14 text-[13.5px] inline-flex items-center capitalize transition-colors",
                currentTab === tab
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
              {currentTab === tab && (
                <span className="absolute left-3 right-3 bottom-0 h-px bg-foreground" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Search..."
              className="h-8 w-[220px] rounded-md border border-border bg-card/60 pl-8 pr-10 text-[12.5px] placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              /
            </kbd>
          </div>

          {sessionUser ? (
            <UserMenu user={sessionUser} onSubmitPost={onSubmitPost} />
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onSignIn}
                className="px-3 h-8 rounded-md border border-border text-[12.5px] font-medium text-foreground/80 hover:text-foreground hover:bg-muted transition-colors inline-flex items-center"
              >
                Sign in
              </button>
              <button
                onClick={onSignUp}
                className="px-3 h-8 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:bg-primary/90 transition-colors inline-flex items-center"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function StatusFilterChip({
  id,
  active,
  onClick,
}: {
  id: StatusKey;
  active: boolean;
  onClick: () => void;
}) {
  const s = STATUS[id];
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 h-8 text-xs font-medium transition-colors",
        active
          ? "border-current text-foreground"
          : "border-slate-200 text-slate-600 hover:text-slate-900",
      )}
      style={active ? { borderColor: s.dot, color: s.dot } : undefined}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </button>
  );
}

function FilterRow({
  active,
  toggle,
  sort,
  setSort,
}: {
  active: Set<StatusKey>;
  toggle: (id: StatusKey) => void;
  sort: "top" | "new";
  setSort: (s: "top" | "new") => void;
}) {
  const statuses = Object.keys(STATUS) as StatusKey[];
  return (
    <div className="flex flex-wrap items-center gap-2.5 pb-4 border-b border-slate-100">
      {/* Search */}
      <div className="relative w-60">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Search posts..."
          className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-[12.5px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div className="h-5 w-px bg-slate-200" />

      {/* Sort segmented control */}
      <div className="inline-flex rounded-lg bg-slate-100 p-1 gap-0.5">
        <button
          onClick={() => setSort("top")}
          className={cn(
            "px-3 py-1 text-[12.5px] font-medium rounded-md transition-colors",
            sort === "top"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900",
          )}
        >
          Top
        </button>
        <button
          onClick={() => setSort("new")}
          className={cn(
            "px-3 py-1 text-[12.5px] font-medium rounded-md transition-colors",
            sort === "new"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900",
          )}
        >
          New
        </button>
      </div>

      <div className="h-5 w-px bg-slate-200" />

      {/* Status filters */}
      <span className="text-[12px] font-medium text-slate-500">Status</span>
      {statuses.map((id) => (
        <StatusFilterChip key={id} id={id} active={active.has(id)} onClick={() => toggle(id)} />
      ))}
    </div>
  );
}

function StatusPill({ id }: { id: StatusKey }) {
  const s = STATUS[id];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

function FeedbackCard({
  post,
  orgSlug,
  initialVoted,
  sessionUser,
  onAuthRequired,
}: {
  post: PublicPost;
  orgSlug: string;
  initialVoted: boolean;
  sessionUser: SessionUser | null;
  onAuthRequired: () => void;
}) {
  const [voted, setVoted] = useState(initialVoted);
  const [voteCount, setVoteCount] = useState(post.voteCount);
  const [voting, setVoting] = useState(false);

  async function handleVote() {
    if (!sessionUser) {
      onAuthRequired();
      return;
    }
    if (voting) return;
    const wasVoted = voted;
    setVoted(!wasVoted);
    setVoteCount((c) => (wasVoted ? c - 1 : c + 1));
    setVoting(true);
    try {
      const res = await fetch("/api/public-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, orgSlug }),
      });
      const json = (await res.json()) as { voted?: boolean; voteCount?: number; error?: string };
      if (!res.ok) throw new Error(json.error);
      setVoted(json.voted ?? !wasVoted);
      setVoteCount(json.voteCount ?? voteCount);
    } catch {
      setVoted(wasVoted);
      setVoteCount((c) => (wasVoted ? c + 1 : c - 1));
    } finally {
      setVoting(false);
    }
  }

  return (
    <article className="group py-4 px-0 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50/50 -mx-4 px-4 transition-colors">
      <div className="flex items-start gap-4">
        {/* Vote pill on left */}
        <button
          onClick={(e) => {
            e.preventDefault();
            handleVote();
          }}
          disabled={voting}
          aria-label={voted ? "Remove vote" : "Upvote"}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border h-12 w-12 shrink-0 transition-all disabled:opacity-60",
            voted
              ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
              : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
          )}
        >
          <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span className="text-[10px] font-bold leading-none mt-0.5">{voteCount}</span>
        </button>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug text-slate-900 mb-1">
            {post.title}
          </h3>
          {post.description && (
            <p className="text-[13px] leading-relaxed text-slate-600 line-clamp-2 mb-2">
              {post.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <StatusPill id={post.status} />
            <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{post.commentCount}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function PublicSidebar({
  boards,
  selectedBoardId = "all",
  onSelectBoard,
  onAuthRequired,
}: {
  boards: PublicBoard[];
  selectedBoardId?: string;
  onSelectBoard: (id: string) => void;
  onAuthRequired: () => void;
}) {
  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ url: window.location.href });
    } else {
      handleCopyLink();
    }
  }

  return (
    <aside className="w-[240px] shrink-0 pr-0">
      {boards.length > 0 && (
        <div>
          <div className="px-2 text-[11px] tracking-wider text-muted-foreground/80 uppercase">
            Boards
          </div>
          <ul className="mt-2 flex flex-col">
            <li>
              <button
                onClick={() => onSelectBoard("all")}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-md px-2.5 h-9 text-[13px] transition-colors",
                  selectedBoardId === "all"
                    ? "bg-muted text-foreground"
                    : "text-foreground/85 hover:bg-muted/60",
                )}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: "hsl(var(--foreground))" }}
                />
                All Feedback
              </button>
            </li>
            {boards.map((board, i) => (
              <li key={board.id}>
                <button
                  onClick={() => onSelectBoard(board.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-md px-2.5 h-9 text-[13px] transition-colors",
                    selectedBoardId === board.id
                      ? "bg-muted text-foreground"
                      : "text-foreground/85 hover:bg-muted/60",
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: BOARD_COLORS[i % BOARD_COLORS.length] }}
                  />
                  <span className="truncate">{board.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-7">
        <div className="px-2 text-[11px] tracking-wider text-muted-foreground/80 uppercase">
          Actions
        </div>
        <ul className="mt-2 flex flex-col">
          <li>
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-2.5 rounded-md px-2.5 h-9 text-[13px] text-foreground/80 hover:bg-muted/60 hover:text-foreground"
            >
              <Link2 className="h-3.5 w-3.5" />
              Copy link
            </button>
          </li>
          <li>
            <button
              onClick={handleShare}
              className="w-full flex items-center gap-2.5 rounded-md px-2.5 h-9 text-[13px] text-foreground/80 hover:bg-muted/60 hover:text-foreground"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          </li>
        </ul>
      </div>

      {/* Sidebar CTA removed: primary Give Feedback button stays top-right */}
    </aside>
  );
}

function FeedbackModal({
  orgSlug,
  boards,
  publicUser,
  widgetToken,
  onClose,
  onSubmitted,
}: {
  orgSlug: string;
  boards: PublicBoard[];
  publicUser: { id: string; email: string; name?: string } | null;
  widgetToken: string | null;
  onClose: () => void;
  onSubmitted: (post: PublicPost) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [boardId, setBoardId] = useState(boards[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  const authorName = publicUser?.name ?? publicUser?.email ?? "Anonymous";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !boardId) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { orgSlug, boardId, title, description };

      // If the user was auto-logged in, attach their identity to the submission
      // so the backend can store and verify it.
      if (publicUser && widgetToken) {
        body.widgetToken = widgetToken;
        body.submitter = { id: publicUser.id, email: publicUser.email, name: publicUser.name };
      }

      const res = await fetch("/api/public-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) throw new Error(json.error ?? "Submission failed");

      const board = boards.find((b) => b.id === boardId);
      onSubmitted({
        id: json.id ?? Date.now().toString(),
        title: title.trim(),
        description: description.trim() || null,
        status: "pending",
        boardId,
        boardName: board?.name ?? "",
        authorName,
        voteCount: 0,
        commentCount: 0,
      });
      toast.success("Feedback submitted! Thank you.");
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[480px] max-w-[92vw] rounded-xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Give feedback</h3>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {publicUser && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ background: avatarColor(authorName) }}
            >
              {getInitials(authorName)}
            </div>
            <span className="text-[12.5px] text-muted-foreground">
              Submitting as <span className="font-medium text-foreground">{authorName}</span>
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {boards.length > 1 && (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Board
              </label>
              <select
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2 text-[13px] outline-none focus:border-primary"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A short, clear summary"
              required
              className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2.5 text-[13px] outline-none focus:border-primary placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Details <span className="normal-case text-muted-foreground/70">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What happened? What did you expect?"
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-[13px] outline-none focus:border-primary placeholder:text-muted-foreground resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateBoardFab() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center">
      <a
        href="https://feediyo.com"
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/90 backdrop-blur px-4 h-9 text-[12.5px] text-foreground/90 shadow-lg shadow-black/20 hover:bg-card transition-colors"
      >
        Powered by Feediyo
      </a>
    </div>
  );
}

function DetailPanel({
  post,
  orgSlug,
  onClose,
  initialVoted,
  sessionUser,
  onAuthRequired,
}: {
  post: PublicPost | null;
  orgSlug: string;
  onClose: () => void;
  initialVoted: boolean;
  sessionUser: SessionUser | null;
  onAuthRequired: () => void;
}) {
  const [voted, setVoted] = useState(initialVoted);
  const [voteCount, setVoteCount] = useState(post?.voteCount ?? 0);
  const [voting, setVoting] = useState(false);

  if (!post) return null;
  const postId = post.id;

  async function handleVote() {
    if (!sessionUser) {
      onAuthRequired();
      return;
    }
    if (voting) return;
    const wasVoted = voted;
    setVoted(!wasVoted);
    setVoteCount((c) => (wasVoted ? c - 1 : c + 1));
    setVoting(true);
    try {
      const res = await fetch("/api/public-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, orgSlug }),
      });
      const json = (await res.json()) as { voted?: boolean; voteCount?: number; error?: string };
      if (!res.ok) throw new Error(json.error);
      setVoted(json.voted ?? !wasVoted);
      setVoteCount(json.voteCount ?? voteCount);
    } catch {
      setVoted(wasVoted);
      setVoteCount((c) => (wasVoted ? c + 1 : c - 1));
    } finally {
      setVoting(false);
    }
  }

  return (
    <Sheet open={!!post} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-[480px] p-0">
        {/* Header */}
        <SheetHeader className="border-b border-slate-100 px-6 py-4 space-y-3">
          <div className="flex items-center gap-2 text-[12.5px] text-slate-600">
            <span className="font-medium text-slate-900">{post.authorName}</span>
            <span className="inline-flex items-center gap-1 rounded border border-slate-200 px-1.5 py-px text-[11.5px] text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: BOARD_COLORS[0] }} />
              {post.boardName}
            </span>
          </div>
          <SheetTitle className="text-lg font-semibold leading-snug text-slate-900">
            {post.title}
          </SheetTitle>
          <div>
            <StatusPill id={post.status} />
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <p className="text-sm leading-relaxed text-slate-700">{post.description}</p>

          {/* Vote button */}
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleVote}
              disabled={voting}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border h-16 w-16 transition-all disabled:opacity-60 shrink-0",
                voted
                  ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                  : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
              <span className="text-xs font-bold leading-none mt-1">{voteCount}</span>
            </button>
            <div>
              <p className="text-[12.5px] font-medium text-slate-900">
                {voteCount} {voteCount === 1 ? "person" : "people"} upvoted
              </p>
              <p className="text-[12px] text-slate-600 mt-1">
                {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
              </p>
            </div>
          </div>

          {/* Separator */}
          <div className="my-6 h-px bg-slate-100" />

          {/* Comments section */}
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Comments
          </div>
          <div className="py-8 text-center text-[13px] text-slate-500">
            Comment section would display here
          </div>
        </div>

        {/* Footer - Comment input */}
        <div className="border-t border-slate-100 px-6 py-4 bg-white shrink-0">
          <input
            type="text"
            placeholder="Add a comment..."
            className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-[12.5px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Roadmap View ─────────────────────────────────────────────────────────────

const ROADMAP_COLUMNS: { key: StatusKey[]; label: string; subtitle: string; color: string }[] = [
  { key: ["inprogress"], label: "Now", subtitle: "Currently being built", color: "#f59e0b" },
  { key: ["planned"], label: "Next", subtitle: "Committed and planned", color: "#3b82f6" },
  {
    key: ["pending", "reviewing"],
    label: "Exploring",
    subtitle: "Under consideration",
    color: "#f97316",
  },
];

function RoadmapCard({
  post,
  accentColor,
  orgSlug,
  initialVoted,
  sessionUser,
  onAuthRequired,
}: {
  post: PublicPost;
  accentColor: string;
  orgSlug: string;
  initialVoted: boolean;
  sessionUser: SessionUser | null;
  onAuthRequired: () => void;
}) {
  const [voted, setVoted] = useState(initialVoted);
  const [voteCount, setVoteCount] = useState(post.voteCount);
  const [voting, setVoting] = useState(false);

  async function handleVote() {
    if (!sessionUser) {
      onAuthRequired();
      return;
    }
    if (voting) return;
    const wasVoted = voted;
    setVoted(!wasVoted);
    setVoteCount((c) => (wasVoted ? c - 1 : c + 1));
    setVoting(true);
    try {
      const res = await fetch("/api/public-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, orgSlug }),
      });
      const json = (await res.json()) as { voted?: boolean; voteCount?: number; error?: string };
      if (!res.ok) throw new Error(json.error);
      setVoted(json.voted ?? !wasVoted);
      setVoteCount(json.voteCount ?? voteCount);
    } catch {
      setVoted(wasVoted);
      setVoteCount((c) => (wasVoted ? c + 1 : c - 1));
    } finally {
      setVoting(false);
    }
  }

  return (
    <article className="w-full rounded-xl border border-border bg-card p-4 flex flex-col gap-3 hover:shadow-md hover:border-border/80 transition-all">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: accentColor }} />
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {post.boardName}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-[13.5px] font-semibold leading-snug text-foreground line-clamp-2">
          {post.title}
        </h3>
        {post.description && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground line-clamp-3">
            {post.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
            style={{ background: avatarColor(post.authorName) }}
          >
            {getInitials(post.authorName)}
          </div>
          <span className="text-[11.5px] text-muted-foreground truncate">{post.authorName}</span>
        </div>
        <button
          type="button"
          onClick={handleVote}
          disabled={voting}
          className={cn(
            "inline-flex items-center gap-1 text-[12px] shrink-0 ml-2 transition-colors disabled:opacity-60",
            voted ? "text-slate-900 hover:text-slate-800" : "text-slate-500 hover:text-slate-900",
          )}
        >
          <ArrowUp
            className={cn("h-3.5 w-3.5 transition-all", voted && "fill-current")}
            strokeWidth={2.5}
          />
          {voteCount}
        </button>
      </div>
    </article>
  );
}

function RoadmapView({
  posts,
  orgSlug,
  votedPostIds,
  sessionUser,
  onAuthRequired,
}: {
  posts: PublicPost[];
  orgSlug: string;
  votedPostIds: string[];
  sessionUser: SessionUser | null;
  onAuthRequired: () => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-5 items-start">
      {ROADMAP_COLUMNS.map((col) => {
        const colPosts = posts
          .filter((p) => col.key.includes(p.status))
          .sort((a, b) => b.voteCount - a.voteCount);
        return (
          <div key={col.label} className="flex flex-col gap-3 min-w-0">
            <div className="pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: col.color }}
                />
                <h2 className="text-[15px] font-bold tracking-tight">{col.label}</h2>
                <span className="text-[12px] text-muted-foreground tabular-nums">
                  {colPosts.length}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground pl-[18px]">{col.subtitle}</p>
            </div>

            {colPosts.map((post) => (
              <RoadmapCard
                key={post.id}
                post={post}
                accentColor={col.color}
                orgSlug={orgSlug}
                initialVoted={votedPostIds.includes(post.id)}
                sessionUser={sessionUser}
                onAuthRequired={onAuthRequired}
              />
            ))}

            {colPosts.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/50 py-10 text-center">
                <p className="text-[12.5px] text-muted-foreground">Nothing here yet.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Updates (Changelog) View ─────────────────────────────────────────────────

function UpdateEntry({ entry }: { entry: PublicChangelog }) {
  return (
    <article className="py-10 border-b border-border/60 last:border-0">
      <time className="text-[12.5px] text-muted-foreground font-medium">
        {formatDate(entry.publishedAt)}
      </time>
      <h2 className="mt-3 text-[22px] font-bold leading-tight text-foreground">{entry.title}</h2>
      {entry.excerpt && (
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground line-clamp-3">
          {entry.excerpt}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ background: avatarColor(entry.authorName) }}
        >
          {getInitials(entry.authorName)}
        </div>
        <span className="text-[12.5px] text-foreground/80">{entry.authorName}</span>
      </div>
    </article>
  );
}

function UpNextSidebar({ posts }: { posts: { id: string; title: string; voteCount: number }[] }) {
  if (posts.length === 0) return null;
  return (
    <aside className="w-[220px] shrink-0 pl-2">
      <div className="px-2 text-[11px] tracking-wider text-muted-foreground/80 uppercase">
        Up next
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {posts.map((p) => (
          <li
            key={p.id}
            className="flex flex-col gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-2.5"
          >
            <StatusPill id="planned" />
            <span className="text-[12.5px] leading-snug text-foreground/85 line-clamp-3">
              {p.title}
            </span>
            <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
              <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
              {p.voteCount}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function UpdatesView({ entries }: { entries: PublicChangelog[] }) {
  return (
    <section className="min-w-0 flex-1">
      {entries.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          No updates published yet.
        </div>
      ) : (
        entries.map((entry) => <UpdateEntry key={entry.id} entry={entry} />)
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublicBoardPage({ loaderData }: Route.ComponentProps) {
  const {
    org,
    boards,
    posts,
    changelogEntries,
    upNextPosts,
    votedPostIds,
    sessionUser,
    publicUser,
    widgetToken,
  } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const currentTab: PublicTab = rawTab === "roadmap" || rawTab === "updates" ? rawTab : "feedback";

  const [activeStatuses, setActiveStatuses] = useState<Set<StatusKey>>(new Set());
  const [sort, setSort] = useState<"top" | "new">("top");
  const [selectedBoardId, setSelectedBoardId] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [localPosts, setLocalPosts] = useState<PublicPost[]>([]);
  const [authModal, setAuthModal] = useState<AuthTab | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  function toggleStatus(id: StatusKey) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allPosts = useMemo(() => [...localPosts, ...posts], [localPosts, posts]);

  const filtered = useMemo(() => {
    let list = allPosts;
    if (activeStatuses.size > 0) list = list.filter((p) => activeStatuses.has(p.status));
    if (selectedBoardId !== "all") list = list.filter((p) => p.boardId === selectedBoardId);
    if (sort === "top") return [...list].sort((a, b) => b.voteCount - a.voteCount);
    return [...list].sort((a, b) => {
      // localPosts have no real date ordering; keep insertion order for "new"
      const ai = allPosts.indexOf(a);
      const bi = allPosts.indexOf(b);
      return ai - bi;
    });
  }, [allPosts, activeStatuses, selectedBoardId, sort]);

  function handleSubmitted(post: PublicPost) {
    setLocalPosts((prev) => [post, ...prev]);
  }

  function openFeedbackOrAuth() {
    if (sessionUser) {
      setShowModal(true);
    } else {
      setAuthModal("sign-in");
    }
  }

  return (
    <div className="min-h-screen">
      <TopNav
        orgName={org.name}
        sessionUser={sessionUser ?? null}
        currentTab={currentTab}
        onSubmitPost={() => setShowModal(true)}
        onSignIn={() => setAuthModal("sign-in")}
        onSignUp={() => setAuthModal("sign-up")}
      />

      <main className="mx-auto max-w-[1440px] px-6 pt-16 pb-32">
        {currentTab === "feedback" && (
          <div className="flex gap-10">
            <PublicSidebar
              boards={boards}
              selectedBoardId={selectedBoardId}
              onSelectBoard={setSelectedBoardId}
              onAuthRequired={openFeedbackOrAuth}
            />
            <section className="min-w-0 flex-1">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">
                    {selectedBoardId === "all"
                      ? "All Feedback"
                      : (boards.find((b) => b.id === selectedBoardId)?.name ?? "Feedback")}
                  </h1>
                  <p className="mt-0.5 text-[13px] text-slate-600">
                    {filtered.length} posts · vote on what matters most to you
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
                >
                  <Megaphone className="h-4 w-4" />
                  Give Feedback
                </button>
              </div>

              {/* Toolbar */}
              <FilterRow
                active={activeStatuses}
                toggle={toggleStatus}
                sort={sort}
                setSort={setSort}
              />

              {/* Feed */}
              <div className="mt-4">
                {filtered.map((post) => (
                  <FeedbackCard
                    key={post.id}
                    post={post}
                    orgSlug={org.slug}
                    initialVoted={(votedPostIds ?? []).includes(post.id)}
                    sessionUser={sessionUser ?? null}
                    onAuthRequired={openFeedbackOrAuth}
                  />
                ))}
                {filtered.length === 0 && (
                  <div className="flex items-center justify-center py-20 text-sm text-slate-500">
                    {posts.length === 0
                      ? "No feedback yet. Be the first to share!"
                      : "No feedback matches the current filters."}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {currentTab === "roadmap" && (
          <RoadmapView
            posts={[...localPosts, ...posts]}
            orgSlug={org.slug}
            votedPostIds={votedPostIds ?? []}
            sessionUser={sessionUser ?? null}
            onAuthRequired={openFeedbackOrAuth}
          />
        )}

        {currentTab === "updates" && (
          <div className="flex gap-10">
            <PublicSidebar
              boards={boards}
              onSelectBoard={(id) => {
                setSelectedBoardId(id);
                setSearchParams({});
              }}
              onAuthRequired={openFeedbackOrAuth}
            />
            <UpdatesView entries={changelogEntries ?? []} />
            <UpNextSidebar posts={upNextPosts ?? []} />
          </div>
        )}
      </main>

      <CreateBoardFab />

      {showModal && (
        <FeedbackModal
          orgSlug={org.slug}
          boards={boards}
          publicUser={publicUser ?? null}
          widgetToken={widgetToken ?? null}
          onClose={() => setShowModal(false)}
          onSubmitted={handleSubmitted}
        />
      )}

      {authModal && (
        <PublicAuthModal
          initialTab={authModal}
          onClose={() => setAuthModal(null)}
          onSuccess={() => window.location.reload()}
        />
      )}

      {selectedPostId && (
        <DetailPanel
          post={[...localPosts, ...posts].find((p) => p.id === selectedPostId) ?? null}
          orgSlug={org.slug}
          onClose={() => setSelectedPostId(null)}
          initialVoted={(votedPostIds ?? []).includes(selectedPostId)}
          sessionUser={sessionUser ?? null}
          onAuthRequired={openFeedbackOrAuth}
        />
      )}
    </div>
  );
}

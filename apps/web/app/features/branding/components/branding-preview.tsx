import { cn } from "@lib/utils";
import { useState } from "react";
import { COLOR_OPTIONS, type ColorValue, type ThemeValue } from "../constants/branding-options";

interface BrandingPreviewProps {
  name: string;
  logo: string;
  primaryColor: ColorValue;
  theme: ThemeValue;
  hidePoweredBy?: boolean;
}

type PreviewTab = "feedback" | "roadmap" | "changelog";

const PREVIEW_TABS: { key: PreviewTab; label: string }[] = [
  { key: "feedback", label: "Feedback" },
  { key: "roadmap", label: "Roadmap" },
  { key: "changelog", label: "Changelogs" },
];

const FAKE_BOARDS = [
  { name: "Feature Requests", color: "#22c55e" },
  { name: "Bug Reports", color: "#3b82f6" },
];

const FAKE_POSTS = [
  { title: "Add google sheet integration", description: "This is how it looks !", commentCount: 0, status: "planned", votes: 0 },
  { title: "Export feedback to CSV", description: "Would love a one-click CSV export", commentCount: 2, status: "reviewing", votes: 12 },
  { title: "Support custom domains", description: "Allow CNAME mapping for portals", commentCount: 1, status: "pending", votes: 5 },
];

const STATUS_PREVIEW: Record<string, { label: string; fg: string; bg: string; dot: string }> = {
  pending:   { label: "Pending",      fg: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
  reviewing: { label: "Under Review", fg: "#475569", bg: "#f1f5f9", dot: "#94a3b8" },
  planned:   { label: "Planned",      fg: "#1d4ed8", bg: "#dbeafe", dot: "#3b82f6" },
  inprogress:{ label: "In Progress",  fg: "#b45309", bg: "#fef3c7", dot: "#f59e0b" },
  completed: { label: "Shipped",      fg: "#047857", bg: "#d1fae5", dot: "#10b981" },
  closed:    { label: "Closed",       fg: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" },
};

const ROADMAP_COLS = [
  {
    label: "Planned",
    dot: "#B68A52", colBg: "#F2E8D6", colInk: "#7A5A2E",
    posts: [
      { title: "Add google sheet integration", commentCount: 0, boardName: "Feature Requests", votes: 0 },
      { title: "Dark mode support", commentCount: 2, boardName: "Feature Requests", votes: 8 },
    ],
  },
  {
    label: "In Progress",
    dot: "#4A6FA5", colBg: "#E2EAF4", colInk: "#2E4A75",
    posts: [
      { title: "Mobile app", commentCount: 5, boardName: "Feature Requests", votes: 23 },
    ],
  },
  {
    label: "Completed",
    dot: "#5C8A6E", colBg: "#E2ECE3", colInk: "#2F5740",
    posts: [
      { title: "Custom domains", commentCount: 1, boardName: "Feature Requests", votes: 15 },
      { title: "Webhooks", commentCount: 3, boardName: "Bug Reports", votes: 10 },
    ],
  },
];

const FAKE_CHANGELOGS = [
  { title: "Improved search & filtering", date: "Jul 12", tag: "improvement", version: null },
  { title: "Google Sheets integration", date: "Jun 28", tag: "feature", version: "v2.4.0" },
  { title: "Bug fixes & performance", date: "Jun 14", tag: "fix", version: null },
];

const CL_MINT = "#7EB8A6";
const CL_MONO = '"Geist Mono", ui-monospace, monospace';
const CL_TAG: Record<string, { color: string; bg: string; border: string }> = {
  feature:     { color: "#7EB8A6", bg: "rgba(126,184,166,0.10)", border: "rgba(126,184,166,0.30)" },
  improvement: { color: "#D4A05A", bg: "rgba(212,160,90,0.10)",  border: "rgba(212,160,90,0.30)"  },
  fix:         { color: "#E08585", bg: "rgba(224,133,133,0.10)", border: "rgba(224,133,133,0.30)" },
  api:         { color: "#7A8AB0", bg: "rgba(122,138,176,0.12)", border: "rgba(122,138,176,0.30)" },
};

function BrowserChrome({ slug }: { slug: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/60 border-b border-border shrink-0">
      <div className="size-2.5 rounded-full bg-red-400/60" />
      <div className="size-2.5 rounded-full bg-yellow-400/60" />
      <div className="size-2.5 rounded-full bg-green-400/60" />
      <span className="ml-auto text-xs text-muted-foreground font-mono">
        {slug}.feeduro.com
      </span>
    </div>
  );
}

function PortalNav({
  displayName,
  initial,
  logo,
  colorHex,
  isDark,
  activeTab,
  onTabChange,
}: {
  displayName: string;
  initial: string;
  logo: string;
  colorHex: string;
  isDark: boolean;
  activeTab: PreviewTab;
  onTabChange: (tab: PreviewTab) => void;
}) {
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const textMuted = isDark ? "#6b7280" : "#9ca3af";
  const textPrimary = isDark ? "#f9fafb" : "#111827";

  return (
    <div style={{ borderBottom: `1px solid ${borderColor}` }}>
      <div className="grid grid-cols-3 items-center px-4 pt-2.5 pb-0">
        {/* Left: logo + org name */}
        <div className="flex items-center gap-2 min-w-0">
          {logo ? (
            <img src={logo} alt="" className="size-6 object-contain rounded shrink-0" />
          ) : (
            <div
              className="size-6 rounded flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: colorHex }}
            >
              {initial}
            </div>
          )}
          <span className="text-sm font-semibold truncate" style={{ color: textPrimary }}>
            {displayName}
          </span>
        </div>

        {/* Center: tab nav */}
        <div className="flex items-center justify-center gap-0.5">
          {PREVIEW_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className="relative px-2 py-2 text-xs font-medium transition-colors"
                style={{ color: isActive ? textPrimary : textMuted }}
              >
                {tab.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                    style={{ backgroundColor: colorHex }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: bell + avatar */}
        <div className="flex items-center justify-end gap-2">
          <svg
            className="size-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke={textMuted}
            strokeWidth="2"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <div
            className="size-6 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
            style={{ backgroundColor: colorHex }}
          >
            U
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackView({
  isDark,
  colorHex,
  hidePoweredBy,
}: {
  isDark: boolean;
  colorHex: string;
  hidePoweredBy: boolean;
}) {
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const mutedBg = isDark ? "rgba(255,255,255,0.04)" : "#f9fafb";
  const textMuted = isDark ? "#6b7280" : "#9ca3af";
  const textPrimary = isDark ? "#f9fafb" : "#111827";

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Sidebar — left panel, matches PublicSidebar layout */}
      <div
        className="w-44 shrink-0 py-3 flex flex-col"
        style={{ borderRight: `1px solid ${borderColor}` }}
      >
        <div>
          <p className="px-3 text-[10px] tracking-wider uppercase mb-1.5" style={{ color: textMuted }}>
            Boards
          </p>
          {FAKE_BOARDS.map((board, i) => (
            <div
              key={board.name}
              className="mx-1 flex items-center gap-2 rounded-md px-2.5 h-8"
              style={{ backgroundColor: i === 0 ? (isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6") : "transparent" }}
            >
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: board.color }} />
              <span className="flex-1 min-w-0 truncate text-[12px] text-left" style={{ color: textPrimary }}>{board.name}</span>
              <span className="text-[11px] shrink-0" style={{ color: textMuted }}>1</span>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <p className="px-3 text-[10px] tracking-wider uppercase mb-1.5" style={{ color: textMuted }}>
            Actions
          </p>
          <div className="mx-1 flex items-center gap-2 rounded-md px-2.5 h-8">
            <svg className="size-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span className="text-[12px]" style={{ color: textMuted }}>Copy link</span>
          </div>
        </div>

        {!hidePoweredBy && (
          <div className="mt-auto px-3 pb-1">
            <p className="text-[11px]" style={{ color: isDark ? "#374151" : "#d1d5db" }}>
              Powered by Feeduro
            </p>
          </div>
        )}
      </div>

      {/* Main — right of sidebar */}
      <div className="flex-1 min-w-0 overflow-hidden px-3 py-3 flex flex-col gap-2.5">
        {/* Submission card */}
        <div
          className="rounded-lg border p-3 shrink-0"
          style={{ borderColor, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#ffffff" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs" style={{ color: textMuted }}>Submission title</span>
            <span className="text-sm leading-none" style={{ color: textMuted }}>×</span>
          </div>
          <span className="text-xs block mb-3" style={{ color: textMuted }}>Add details</span>
          <div className="flex items-center justify-between gap-2">
            <div
              className="flex items-center gap-1 px-2 py-1 rounded border text-xs"
              style={{ borderColor, color: textMuted, backgroundColor: mutedBg }}
            >
              Feature Requests
              <svg className="size-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: textMuted }}>Attach</span>
              <span
                className="px-2 py-1 rounded text-white text-xs font-medium"
                style={{ backgroundColor: colorHex }}
              >
                Give Feedback
              </span>
            </div>
          </div>
        </div>

        {/* Search + controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded border text-xs"
            style={{ borderColor, color: textMuted, backgroundColor: mutedBg }}
          >
            <svg className="size-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Search posts...
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded border text-xs shrink-0" style={{ borderColor, color: textMuted }}>
            Sort: Trending
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded border text-xs shrink-0" style={{ borderColor, color: textMuted }}>
            Filter
          </div>
        </div>

        {/* Post list */}
        <div className="flex flex-col flex-1">
          {FAKE_POSTS.map((post, i) => {
            const s = STATUS_PREVIEW[post.status] ?? { label: "Pending", fg: "#6b7280", bg: "#f3f4f6", dot: "#9ca3af" };
            return (
              <div
                key={post.title}
                className="flex items-center gap-3 py-2"
                style={{
                  borderBottom: i < FAKE_POSTS.length - 1 ? `1px solid ${borderColor}` : "none",
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold leading-snug truncate" style={{ color: textPrimary }}>
                    {post.title}
                  </p>
                  {post.description && (
                    <p className="text-[11px] truncate mt-0.5" style={{ color: textMuted }}>
                      {post.description}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-1">
                    {/* Comment icon */}
                    <svg className="size-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="text-[10px]" style={{ color: textMuted }}>{post.commentCount}</span>
                    <span className="mx-0.5 text-[10px]" style={{ color: borderColor }}>·</span>
                    {/* Status pill */}
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ background: s.bg, color: s.fg }}
                    >
                      <span className="h-1 w-1 rounded-full shrink-0" style={{ background: s.dot }} />
                      {s.label}
                    </span>
                  </div>
                </div>
                {/* Vote button — square, no border-radius, matching real design */}
                <div
                  className="flex flex-col items-center justify-center border shrink-0 w-7 py-1"
                  style={{ borderColor, color: textMuted }}
                >
                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m18 15-6-6-6 6" />
                  </svg>
                  <span className="text-[11px] font-bold leading-none mt-0.5" style={{ color: textPrimary }}>
                    {post.votes}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RoadmapView({ isDark, hidePoweredBy }: { isDark: boolean; hidePoweredBy: boolean }) {
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const textMuted = isDark ? "#6b7280" : "#9ca3af";
  const textPrimary = isDark ? "#f9fafb" : "#111827";

  return (
    <div className="flex flex-col flex-1 px-3 py-3">
      <div className="flex gap-3 flex-1">
        {ROADMAP_COLS.map((col) => (
          <div key={col.label} className="flex-1 flex flex-col">
            {/* Column header */}
            <div className="flex items-center gap-1.5 px-1 pb-2">
              <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: col.dot }} />
              <span className="text-[11px] font-semibold" style={{ color: textPrimary }}>
                {col.label}
              </span>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: col.colBg, color: col.colInk }}
              >
                {col.posts.length}
              </span>
            </div>
            {/* Divider */}
            <div style={{ borderTop: `1px solid ${borderColor}`, marginBottom: "6px" }} />
            {/* Post rows */}
            <div className="flex flex-col">
              {col.posts.map((post) => (
                <div
                  key={post.title}
                  className="flex items-center gap-2 py-1.5"
                  style={{ borderBottom: `1px solid ${borderColor}` }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium leading-snug truncate" style={{ color: textPrimary }}>
                      {post.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <svg className="size-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span className="text-[9px]" style={{ color: textMuted }}>{post.commentCount}</span>
                      <span className="text-[9px] mx-0.5" style={{ color: borderColor }}>·</span>
                      <span className="text-[9px] truncate" style={{ color: textMuted }}>{post.boardName}</span>
                    </div>
                  </div>
                  {/* Square vote button */}
                  <div
                    className="flex flex-col items-center justify-center border shrink-0 w-6 py-0.5"
                    style={{ borderColor, color: textMuted }}
                  >
                    <svg className="size-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m18 15-6-6-6 6" />
                    </svg>
                    <span className="text-[9px] font-bold leading-none mt-0.5" style={{ color: textPrimary }}>
                      {post.votes}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!hidePoweredBy && (
        <div className="flex justify-center pt-3">
          <span className="text-xs px-2.5 py-1 rounded-full border" style={{ borderColor, color: textMuted }}>
            Powered by Feeduro
          </span>
        </div>
      )}
    </div>
  );
}

function ChangelogView({ isDark, hidePoweredBy }: { isDark: boolean; hidePoweredBy: boolean }) {
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const textMuted = isDark ? "#6b7280" : "#9ca3af";
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "#ffffff";

  return (
    <div className="flex flex-col flex-1 px-4 py-3">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-base font-bold tracking-tight" style={{ color: textPrimary }}>Changelogs</h3>
        <p className="text-[11px] mt-0.5" style={{ color: textMuted }}>
          Follow up on the latest improvements and updates.
        </p>
      </div>

      {/* Timeline entries */}
      <div className="flex flex-col flex-1" style={{ paddingTop: 4 }}>
        {FAKE_CHANGELOGS.map((entry, i) => {
          const tag = CL_TAG[entry.tag] ?? { color: textMuted, bg: isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6", border: borderColor };
          const isLast = i === FAKE_CHANGELOGS.length - 1;
          return (
            <div key={entry.title} style={{ display: "flex", position: "relative", marginBottom: isLast ? 0 : 14 }}>
              {/* Date column */}
              <div style={{ width: 52, flexShrink: 0, paddingTop: 2 }}>
                <div style={{ fontFamily: CL_MONO, fontSize: 10, fontWeight: 600, color: textMuted, letterSpacing: 0.4, textTransform: "uppercase" }}>
                  {entry.date}
                </div>
              </div>

              {/* Timeline connector */}
              <div style={{ width: 24, flexShrink: 0, position: "relative" }}>
                {/* Vertical line */}
                <div style={{
                  position: "absolute",
                  left: "50%",
                  top: 0,
                  bottom: isLast ? "auto" : -14,
                  height: isLast ? 12 : undefined,
                  width: 1,
                  background: borderColor,
                  transform: "translateX(-50%)",
                }} />
                {/* Mint dot */}
                <div style={{
                  position: "absolute",
                  left: "50%",
                  top: 3,
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: cardBg,
                  border: `2px solid ${CL_MINT}`,
                  boxShadow: `0 0 0 3px ${cardBg}`,
                  transform: "translateX(-50%)",
                }} />
              </div>

              {/* Entry card */}
              <div style={{ flex: 1, minWidth: 0, padding: "8px 10px", borderRadius: 10, background: cardBg, border: `1px solid ${borderColor}` }}>
                {/* Tag + version row */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 5 }}>
                  {entry.version && (
                    <span style={{ fontFamily: CL_MONO, fontSize: 9, fontWeight: 700, color: CL_MINT, background: "rgba(126,184,166,0.14)", padding: "2px 6px", borderRadius: 5, letterSpacing: 0.3 }}>
                      {entry.version}
                    </span>
                  )}
                  <span style={{ color: tag.color, background: tag.bg, border: `1px solid ${tag.border}`, padding: "2px 7px", borderRadius: 999, fontSize: 9, fontWeight: 600, fontFamily: CL_MONO, letterSpacing: 0.2, textTransform: "uppercase" }}>
                    {entry.tag}
                  </span>
                </div>
                {/* Title */}
                <p style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3, letterSpacing: -0.2, color: textPrimary, margin: 0 }}>
                  {entry.title}
                </p>
                {/* Like row */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${borderColor}`, background: cardBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: textMuted }}>{i === 0 ? 12 : i === 1 ? 34 : 8}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!hidePoweredBy && (
        <div className="flex justify-center pt-3">
          <span className="text-xs px-2.5 py-1 rounded-full border" style={{ borderColor, color: textMuted }}>
            Powered by Feeduro
          </span>
        </div>
      )}
    </div>
  );
}

export function BrandingPreview({
  name,
  logo,
  primaryColor,
  theme,
  hidePoweredBy = false,
}: BrandingPreviewProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>("feedback");
  const colorHex = COLOR_OPTIONS.find((c) => c.value === primaryColor)?.hex ?? "#6366f1";
  const isDark = theme === "dark";

  const displayName = name?.trim() || "Your Portal";
  const initial = displayName[0]?.toUpperCase() ?? "?";
  const slug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "your-portal";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-xl border border-border overflow-hidden shadow-sm select-none flex flex-col",
        "min-h-[35rem]",
      )}
      style={{ backgroundColor: isDark ? "#0f0f0f" : "#ffffff" }}
    >
      <BrowserChrome slug={slug} />
      <div className={cn("flex flex-col flex-1", isDark ? "text-gray-100" : "text-gray-900")}>
        <PortalNav
          displayName={displayName}
          initial={initial}
          logo={logo}
          colorHex={colorHex}
          isDark={isDark}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        {activeTab === "feedback" && (
          <FeedbackView isDark={isDark} colorHex={colorHex} hidePoweredBy={hidePoweredBy} />
        )}
        {activeTab === "roadmap" && (
          <RoadmapView isDark={isDark} hidePoweredBy={hidePoweredBy} />
        )}
        {activeTab === "changelog" && (
          <ChangelogView isDark={isDark} hidePoweredBy={hidePoweredBy} />
        )}
      </div>
    </div>
  );
}

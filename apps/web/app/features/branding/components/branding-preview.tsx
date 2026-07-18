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
  { tag: "Feature", title: "Export feedback to CSV", votes: 48 },
  { tag: "Bug", title: "Login fails on Safari mobile", votes: 23 },
  { tag: "Idea", title: "Support custom domains", votes: 15 },
];

const ROADMAP_COLS = [
  { label: "Planned", iconColor: "#f59e0b", items: ["Dark mode support", "CSV export"] },
  { label: "In Progress", iconColor: "#8b5cf6", items: ["Mobile app"] },
  { label: "Completed", iconColor: "#22c55e", items: ["Custom domains", "Webhooks"] },
];

const FAKE_CHANGELOGS = [
  { title: "Improved search & filtering", date: "Jul 12", tag: "Improvement" },
  { title: "Webhook notifications", date: "Jun 28", tag: "New" },
  { title: "Bug fixes & performance", date: "Jun 14", tag: "Fix" },
];

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
      {/* Sidebar */}
      <div
        className="w-36 shrink-0 px-3 py-3 flex flex-col gap-4"
        style={{ borderRight: `1px solid ${borderColor}` }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: textMuted }}>
            Boards
          </p>
          {FAKE_BOARDS.map((board) => (
            <div key={board.name} className="flex items-center justify-between py-1 gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: board.color }} />
                <span className="text-xs truncate font-medium" style={{ color: textPrimary }}>
                  {board.name}
                </span>
              </div>
              <span className="text-xs shrink-0" style={{ color: textMuted }}>0</span>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: textMuted }}>
            Actions
          </p>
          <div className="flex items-center gap-1.5 py-0.5">
            <svg className="size-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke={textMuted} strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span className="text-xs" style={{ color: textMuted }}>Copy link</span>
          </div>
        </div>

        {!hidePoweredBy && (
          <div className="mt-auto">
            <p className="text-xs" style={{ color: isDark ? "#374151" : "#d1d5db" }}>
              Powered by Feeduro
            </p>
          </div>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 px-3 py-3 flex flex-col gap-2.5 overflow-hidden">
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
          {FAKE_POSTS.map((post, i) => (
            <div
              key={post.title}
              className="flex items-center justify-between gap-3 py-2 px-1"
              style={{
                borderBottom: i < FAKE_POSTS.length - 1 ? `1px solid ${borderColor}` : "none",
              }}
            >
              <div className="flex-1 min-w-0">
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-xs font-medium text-white mb-1"
                  style={{ backgroundColor: colorHex }}
                >
                  {post.tag}
                </span>
                <p className="text-xs font-medium truncate" style={{ color: textPrimary }}>
                  {post.title}
                </p>
              </div>
              <div
                className="flex flex-col items-center gap-0.5 px-2 py-1 rounded border shrink-0"
                style={{ borderColor, color: textMuted }}
              >
                <svg className="size-2" viewBox="0 0 8 6" fill="currentColor">
                  <path d="M4 0L8 6H0L4 0Z" />
                </svg>
                <span className="text-xs font-semibold" style={{ color: textPrimary }}>
                  {post.votes}
                </span>
              </div>
            </div>
          ))}
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
      <div className="flex gap-2 flex-1">
        {ROADMAP_COLS.map((col) => (
          <div key={col.label} className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className="size-3 rounded-full shrink-0"
                style={{ backgroundColor: col.iconColor, opacity: 0.8 }}
              />
              <span className="text-xs font-semibold" style={{ color: textPrimary }}>
                {col.label}
              </span>
              <span
                className="text-xs px-1 py-0.5 rounded"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6", color: textMuted }}
              >
                {col.items.length}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {col.items.map((item) => (
                <div
                  key={item}
                  className="rounded-md border px-2.5 py-2"
                  style={{
                    borderColor,
                    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
                  }}
                >
                  <p className="text-xs font-medium" style={{ color: textPrimary }}>{item}</p>
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
  const mutedBg = isDark ? "rgba(255,255,255,0.04)" : "#f9fafb";
  const textMuted = isDark ? "#6b7280" : "#9ca3af";
  const textPrimary = isDark ? "#f9fafb" : "#111827";

  return (
    <div className="flex flex-col flex-1 px-4 py-3 gap-3">
      <div>
        <h3 className="text-lg font-bold" style={{ color: textPrimary }}>Changelogs</h3>
        <p className="text-xs mt-0.5" style={{ color: textMuted }}>
          Follow up on the latest improvements and updates.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs"
          style={{ borderColor, color: textMuted, backgroundColor: mutedBg }}
        >
          <svg className="size-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Search changelogs...
        </div>
        <div
          className="flex items-center gap-1 px-2 py-1.5 rounded border text-xs shrink-0"
          style={{ borderColor, color: textMuted }}
        >
          <svg className="size-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="11" y1="18" x2="13" y2="18" />
          </svg>
          Filter
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {FAKE_CHANGELOGS.map((entry, i) => (
          <div
            key={entry.title}
            className="rounded-md border p-2.5"
            style={{
              borderColor,
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6", color: textMuted }}
              >
                {entry.tag}
              </span>
              <span className="text-xs" style={{ color: textMuted }}>{entry.date}</span>
            </div>
            <p className="text-xs font-semibold" style={{ color: textPrimary }}>{entry.title}</p>
          </div>
        ))}
      </div>

      {!hidePoweredBy && (
        <div className="flex justify-center pb-1">
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

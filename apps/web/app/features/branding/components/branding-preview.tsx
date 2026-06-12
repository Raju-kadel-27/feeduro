import { cn } from "@lib/utils";

import { COLOR_OPTIONS, type ColorValue, type ThemeValue } from "../constants/branding-options";

interface BrandingPreviewProps {
  name: string;
  logo: string;
  primaryColor: ColorValue;
  theme: ThemeValue;
}

const FAKE_POSTS = [
  { tag: "Feature", title: "Export feedback to CSV", votes: 48 },
  { tag: "Bug", title: "Login fails on Safari mobile", votes: 23 },
  { tag: "Idea", title: "Support custom domains", votes: 15 },
];

export function BrandingPreview({ name, logo, primaryColor, theme }: BrandingPreviewProps) {
  const colorHex = COLOR_OPTIONS.find((c) => c.value === primaryColor)?.hex ?? "#6366f1";
  const isDark = theme === "dark";

  const displayName = name?.trim() || "Your Portal";
  const initial = displayName[0]?.toUpperCase() ?? "?";

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-sm select-none">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/60 border-b border-border">
        <div className="size-2 rounded-full bg-red-400/60" />
        <div className="size-2 rounded-full bg-yellow-400/60" />
        <div className="size-2 rounded-full bg-green-400/60" />
        <span className="ml-auto text-[9px] text-muted-foreground font-mono truncate">
          portal.feeduro.app
        </span>
      </div>

      {/* Portal body */}
      <div
        className={cn("transition-colors", isDark ? "text-gray-100" : "text-gray-900")}
        style={{ backgroundColor: isDark ? "#0f0f0f" : "#ffffff" }}
      >
        {/* Header */}
        <div
          className={cn("flex items-center justify-between px-4 py-2.5 border-b")}
          style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb" }}
        >
          <div className="flex items-center gap-2">
            {logo ? (
              <img src={logo} alt="logo" className="size-5 object-contain rounded" />
            ) : (
              <div
                className="size-5 rounded flex items-center justify-center text-[9px] font-bold text-white"
                style={{ backgroundColor: colorHex }}
              >
                {initial}
              </div>
            )}
            <span className="text-[12px] font-semibold">{displayName}</span>
          </div>
          <button
            type="button"
            className="px-2.5 py-1 rounded text-white text-[10px] font-medium"
            style={{ backgroundColor: colorHex }}
          >
            + Feedback
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5">
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[10px]"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f9fafb",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
              color: isDark ? "#6b7280" : "#9ca3af",
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Search posts...
          </div>
        </div>

        {/* Post list */}
        <div className="px-4 pb-3">
          {FAKE_POSTS.map((post, i) => (
            <div
              key={post.title}
              className="flex items-center justify-between gap-3 py-2.5"
              style={{
                borderBottom:
                  i < FAKE_POSTS.length - 1
                    ? `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6"}`
                    : "none",
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-medium text-white"
                    style={{ backgroundColor: colorHex }}
                  >
                    {post.tag}
                  </span>
                </div>
                <span
                  className="text-[11px] font-medium block truncate"
                  style={{ color: isDark ? "#e5e7eb" : "#111827" }}
                >
                  {post.title}
                </span>
              </div>

              {/* Upvote */}
              <div
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md border shrink-0"
                style={{
                  borderColor: isDark ? "rgba(255,255,255,0.10)" : "#e5e7eb",
                  color: isDark ? "#6b7280" : "#9ca3af",
                }}
              >
                <svg width="8" height="6" viewBox="0 0 8 6" fill="currentColor">
                  <path d="M4 0L8 6H0L4 0Z" />
                </svg>
                <span className="text-[10px] font-semibold" style={{ color: isDark ? "#d1d5db" : "#374151" }}>
                  {post.votes}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 text-[9px] text-center border-t"
          style={{
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6",
            color: isDark ? "#4b5563" : "#d1d5db",
          }}
        >
          Powered by Feeduro
        </div>
      </div>
    </div>
  );
}

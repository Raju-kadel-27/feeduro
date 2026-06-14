import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover";
import type { AdminStatus } from "@features/feedback/schemas/admin";
import type { PublicBoard, PublicPost, SessionUser, StatusKey } from "@features/feedback/schemas/public";
import { StatusCircleIcon } from "@features/roadmap/components/status-circle-icon";
import { cn } from "@lib/utils";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { STATUS_COLORS } from "../roadmap-tokens";
import { PublicRoadmapCard } from "./public-roadmap-card";

const COLUMNS: { label: string; subtitle: string; keys: StatusKey[]; icon: AdminStatus }[] = [
  { label: "Planned",     subtitle: "Up next on the roadmap",  keys: ["planned", "pending", "reviewing"], icon: "planned" },
  { label: "In Progress", subtitle: "Currently being built",   keys: ["inprogress"],                      icon: "in-progress" },
  { label: "Completed",   subtitle: "Shipped & available",     keys: ["completed"],                       icon: "completed" },
];

export function PublicRoadmapView({
  posts,
  boards,
  orgSlug,
  votedPostIds,
  sessionUser,
  onAuthRequired,
}: {
  posts: PublicPost[];
  boards: PublicBoard[];
  orgSlug: string;
  votedPostIds: string[];
  sessionUser: SessionUser | null;
  onAuthRequired: () => void;
}) {
  const [selectedBoardId, setSelectedBoardId] = useState<string>("all");

  const visiblePosts = selectedBoardId === "all"
    ? posts
    : posts.filter((p) => p.boardId === selectedBoardId);

  return (
    <div>
      <div className="flex items-end justify-end pb-1 mb-2">
        {boards.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1 h-7 px-2.5 rounded-md border text-[12px] font-medium transition-colors",
                  selectedBoardId !== "all"
                    ? "border-foreground/40 bg-muted text-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted",
                )}
              >
                <SlidersHorizontal className="h-3 w-3" />
                Filter
                {selectedBoardId !== "all" && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-bold">
                    1
                  </span>
                )}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={6} className="p-1 w-44">
              <p className="px-2.5 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Board
              </p>
              <button
                type="button"
                onClick={() => setSelectedBoardId("all")}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <span
                  className={cn(
                    "h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
                    selectedBoardId === "all" ? "bg-foreground border-foreground" : "border-border",
                  )}
                >
                  {selectedBoardId === "all" && <Check className="h-2.5 w-2.5 text-background" />}
                </span>
                <span className={cn(selectedBoardId === "all" && "text-foreground font-medium")}>All boards</span>
              </button>
              {boards.map((board) => (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => setSelectedBoardId(board.id)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <span
                    className={cn(
                      "h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
                      selectedBoardId === board.id ? "bg-foreground border-foreground" : "border-border",
                    )}
                  >
                    {selectedBoardId === board.id && <Check className="h-2.5 w-2.5 text-background" />}
                  </span>
                  <span className={cn(selectedBoardId === board.id && "text-foreground font-medium")}>{board.name}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="grid grid-cols-3 gap-8">
        {COLUMNS.map((col) => {
          const colPosts = visiblePosts.filter((p) => col.keys.includes(p.status));
          const colors = STATUS_COLORS[col.keys[0]] ?? STATUS_COLORS.planned;
          return (
            <div key={col.label}>
              <div className="flex items-center gap-2.5 px-1 pb-3">
                <StatusCircleIcon status={col.icon} size={18} />
                <h2 className="text-[14px] font-semibold text-foreground">{col.label}</h2>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: colors.bg, color: colors.ink }}
                >
                  {colPosts.length}
                </span>
              </div>
              <div className="border-t border-border mb-3" />

              <div className="flex flex-col">
                {colPosts.map((post) => (
                  <PublicRoadmapCard
                    key={post.id}
                    post={post}
                    orgSlug={orgSlug}
                    initialVoted={votedPostIds.includes(post.id)}
                    sessionUser={sessionUser}
                    onAuthRequired={onAuthRequired}
                  />
                ))}
                {colPosts.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border py-10 text-center text-[12.5px] text-muted-foreground">
                    Nothing here yet.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

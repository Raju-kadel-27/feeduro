import type { PublicPost, SessionUser, StatusKey } from "@features/feedback/schemas/public";
import { PublicRoadmapCard } from "./public-roadmap-card";

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

export function PublicRoadmapView({
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
              <PublicRoadmapCard
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

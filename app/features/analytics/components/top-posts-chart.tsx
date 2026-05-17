import { cn } from "@lib/utils";

interface Post {
  id: string;
  title: string;
  voteCount: number | null;
  status: string;
}

const STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-500",
  reviewing: "bg-yellow-500",
  planned: "bg-purple-500",
  "in-progress": "bg-orange-500",
  completed: "bg-green-500",
  closed: "bg-zinc-400",
};

interface TopPostsChartProps {
  posts: Post[];
}

export function TopPostsChart({ posts }: TopPostsChartProps) {
  if (posts.length === 0) {
    return <p className="text-sm text-[#a1a1aa] py-8 text-center">No posts yet.</p>;
  }

  const max = Math.max(...posts.map((p) => p.voteCount ?? 0), 1);

  return (
    <div className="space-y-2.5">
      {posts.map((post) => {
        const votes = post.voteCount ?? 0;
        const pct = Math.round((votes / max) * 100);
        const dot = STATUS_COLOR[post.status] ?? "bg-zinc-400";
        return (
          <div key={post.id} className="flex items-center gap-3">
            <span className={cn("h-2 w-2 rounded-full shrink-0 mt-px", dot)} />
            <span className="w-48 shrink-0 text-[13px] text-[#3f3f46] truncate" title={post.title}>
              {post.title}
            </span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-2 bg-[#f4f4f5] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#f97316] rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs tabular-nums text-[#71717a] w-6 text-right">{votes}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { StatusPill } from "@features/feedback/components/status-pill";
import { ArrowUp } from "lucide-react";

export function UpNextSidebar({
  posts,
}: {
  posts: { id: string; title: string; voteCount: number }[];
}) {
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

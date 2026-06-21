import { ChevronUp, MessageSquare } from "lucide-react";
import type { Post } from "../../types";

export function DragOverlayCard({ post }: { post: Post }) {
  return (
    <div className="flex flex-col gap-2.5 p-3 w-[300px] rounded-lg border border-border bg-card cursor-grabbing rotate-2 scale-[1.03] shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
      <p className="text-xs font-medium leading-snug line-clamp-2 text-foreground">
        {post.title}
      </p>
      {post.boardName && (
        <span className="inline-flex self-start items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-border/80 text-foreground">
          {post.boardName}
        </span>
      )}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {post.authorImage ? (
          <img
            src={post.authorImage}
            alt={post.authorName ?? ""}
            className="h-5 w-5 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold shrink-0">
            {post.authorName?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <span className="inline-flex items-center gap-0.5 text-[10px] tabular-nums bg-muted/70 rounded-full px-1.5 py-0.5">
            <ChevronUp className="h-3 w-3" />
            {post.voteCount}
          </span>
          {post.commentCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] tabular-nums bg-muted/70 rounded-full px-1.5 py-0.5">
              <MessageSquare className="h-2.5 w-2.5" />
              {post.commentCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

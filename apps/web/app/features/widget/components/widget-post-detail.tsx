import type { WidgetPost } from "../types";
import { StatusPill } from "./status-pill";

interface WidgetPostDetailProps {
  post: WidgetPost;
}

export function WidgetPostDetail({ post }: WidgetPostDetailProps) {
  return (
    <div className="px-4 py-5 space-y-3">
      <h2 className="text-[14px] font-semibold leading-snug">{post.title}</h2>

      <div className="flex items-center gap-2.5 flex-wrap">
        <StatusPill id={post.status} />
        <span className="text-[11px] text-muted-foreground tabular-nums">▲ {post.voteCount}</span>
        {post.commentCount > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
          </span>
        )}
      </div>

      {post.description ? (
        <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {post.description}
        </p>
      ) : (
        <p className="text-[12px] text-muted-foreground/60 italic">No description provided.</p>
      )}
    </div>
  );
}

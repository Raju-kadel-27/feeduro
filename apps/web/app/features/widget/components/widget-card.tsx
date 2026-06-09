import { cn } from "@lib/utils";
import { ChevronUp, MessageSquare } from "lucide-react";
import { STATUS } from "../constants";
import type { WidgetPost } from "../types";

interface WidgetCardProps {
  post: WidgetPost;
  onSelect: () => void;
}

export function WidgetCard({ post, onSelect }: WidgetCardProps) {
  const s = STATUS[post.status];

  return (
    <article
      onClick={onSelect}
      className="group flex items-center gap-3 px-4 py-2 border-b border-border/30 last:border-b-0 cursor-pointer hover:bg-accent/30 transition-colors"
    >
      {/* Vote count — far left (read-only; anonymous widget voting requires schema support) */}
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 w-8 h-8 border-[1.5px] shrink-0 select-none",
          "border-border bg-background text-muted-foreground",
        )}
      >
        <ChevronUp className="h-3 w-3 stroke-[1.75]" />
        <span className="text-[10px] font-semibold leading-none tabular-nums">{post.voteCount}</span>
      </div>

      {/* Content — middle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[13px] font-medium leading-snug truncate min-w-0 group-hover:text-primary transition-colors">
            {post.title}
          </p>
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-sm shrink-0"
            style={{ background: s.bg, color: s.fg }}
          >
            <span className="h-1 w-1 rounded-full" style={{ background: s.dot }} />
            {s.label}
          </span>
        </div>
        {post.description && (
          <p className="text-[11.5px] text-muted-foreground line-clamp-1 mt-0.5 leading-relaxed">
            {post.description}
          </p>
        )}
      </div>

      {/* Comments — far right */}
      <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" />
        <span className="text-[11px] tabular-nums">{post.commentCount}</span>
      </div>
    </article>
  );
}

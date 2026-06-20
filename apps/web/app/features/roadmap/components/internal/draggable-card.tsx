import { Card } from "@components/ui/card";
import { useSortable } from "@dnd-kit/react/sortable";
import { cn } from "@lib/utils";
import { GripVertical, MessageSquare } from "lucide-react";
import type { Post, Status } from "../../types";

export function DraggableCard({
  post,
  index,
  column,
  onOpen,
}: {
  post: Post;
  index: number;
  column: Status;
  onOpen: (id: string) => void;
}) {
  const { ref, isDragging } = useSortable({
    id: post.id,
    index,
    type: "item",
    accept: ["item"],
    group: column,
  });

  return (
    <Card
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(post.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(post.id);
        }
      }}
      className={cn(
        "group relative h-[130px] shrink-0 flex flex-col overflow-hidden",
        "cursor-grab active:cursor-grabbing select-none",
        "transition-shadow duration-150 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        isDragging && "opacity-30",
      )}
    >
      {/* Drag handle */}
      <GripVertical className="absolute top-2.5 right-2 h-3.5 w-3.5 text-muted-foreground/25 pointer-events-none" />

      {/* Title — fixed 2-line height */}
      <div className="shrink-0 px-3 pt-3 pr-8">
        <div className="h-10 overflow-hidden">
          <p className="text-sm font-semibold leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-150">
            {post.title}
          </p>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer */}
      <div className="shrink-0 px-3 pb-3 flex items-center gap-2">
        {/* Votes */}
        <span className="inline-flex items-center text-xs tabular-nums text-muted-foreground/80">
          {post.voteCount} votes
        </span>

        {/* Comments */}
        {post.commentCount > 0 && (
          <span
            aria-label={`${post.commentCount} comments`}
            className="inline-flex items-center gap-0.5 text-xs tabular-nums text-muted-foreground/80"
          >
            <MessageSquare className="h-3 w-3" />
            {post.commentCount}
          </span>
        )}

        {/* Board name */}
        {post.boardName && (
          <span className="ml-auto text-xs text-muted-foreground/80 truncate max-w-[96px]">
            {post.boardName}
          </span>
        )}
      </div>
    </Card>
  );
}

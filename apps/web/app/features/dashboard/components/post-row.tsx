import { MessageSquare } from "lucide-react";
import type { Board, Post } from "../types";
import { StatusPill } from "./status-pill";
import { VotePill } from "./vote-pill";

function OwnerBadge({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold shrink-0"
      title={`Owner: ${name}`}
    >
      {initials}
    </span>
  );
}

export function PostRow({
  post,
  board,
  queryKey,
  usersMap,
  onOpen,
}: {
  post: Post;
  board: Board | undefined;
  queryKey: readonly unknown[];
  usersMap?: Record<string, { name: string | null; image: string | null }>;
  onOpen: (id: string) => void;
}) {
  const owner = post.ownerId ? usersMap?.[post.ownerId] : null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 cursor-pointer border-b border-border/30 last:border-b-0"
      onClick={() => onOpen(post.id)}
    >
      <div className="shrink-0">
        <VotePill post={post} queryKey={queryKey} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[15px] font-medium leading-snug truncate min-w-0">
            {post.title}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusPill status={post.status} />
            {board && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] border border-border text-muted-foreground font-medium whitespace-nowrap">
                {board.name}
              </span>
            )}
          </div>
        </div>
        {post.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 leading-relaxed">
            {post.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
        {owner?.name && <OwnerBadge name={owner.name} />}
        <div className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          <span className="text-[11px] tabular-nums">{post.commentCount}</span>
        </div>
      </div>
    </div>
  );
}

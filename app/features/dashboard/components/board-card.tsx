import { VotePill } from "./vote-pill";
import type { Board, Post } from "../types";

export function BoardCard({
  post,
  board,
  queryKey,
  usersMap,
  onOpen,
}: {
  post: Post;
  board: Board | undefined;
  queryKey: readonly unknown[];
  usersMap: Record<string, { name: string; image: string | null }>;
  onOpen: (id: string) => void;
}) {
  return (
    <div
      className="rounded-lg border bg-background p-3 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all group"
      onClick={() => onOpen(post.id)}
    >
      <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-2">
        {post.title}
      </p>
      <div className="flex items-center justify-between">
        {board ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
            {board.name}
          </span>
        ) : (
          <span />
        )}
        <VotePill post={post} queryKey={queryKey} />
      </div>
    </div>
  );
}

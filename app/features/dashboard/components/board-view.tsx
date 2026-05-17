import { BoardCard } from "./board-card";
import { STATUS_CONFIG, STATUS_ORDER } from "../constants";
import type { Board, Post } from "../types";

export function BoardView({
  posts,
  boardMap,
  queryKey,
  usersMap,
  onOpen,
}: {
  posts: Post[];
  boardMap: Record<string, Board>;
  queryKey: readonly unknown[];
  usersMap: Record<string, { name: string; image: string | null }>;
  onOpen: (id: string) => void;
}) {
  const cols = STATUS_ORDER.filter((s) => s !== "closed");

  return (
    <div className="flex gap-3 p-4 overflow-x-auto min-h-[400px]">
      {cols.map((status) => {
        const cfg = STATUS_CONFIG[status];
        const items = posts.filter((p) => p.status === status);
        return (
          <div
            key={status}
            className="flex flex-col min-w-[220px] w-[220px] rounded-xl border bg-muted/30"
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: cfg.hexColor }}
              />
              <span className="text-xs font-semibold">{cfg.label}</span>
              <span className="ml-auto text-[11px] text-muted-foreground font-mono">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-2 overflow-y-auto">
              {items.map((post) => (
                <BoardCard
                  key={post.id}
                  post={post}
                  board={boardMap[post.boardId]}
                  queryKey={queryKey}
                  usersMap={usersMap}
                  onOpen={onOpen}
                />
              ))}
              {items.length === 0 && (
                <p className="text-center text-[11px] text-muted-foreground py-6">No posts</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

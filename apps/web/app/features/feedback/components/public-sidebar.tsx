import { cn } from "@lib/utils";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { BOARD_COLORS } from "../constants";
import type { PublicBoard } from "../schemas/public";

export function PublicSidebar({
  boards,
  postCounts,
  totalCount,
  selectedBoardId = "all",
  onSelectBoard,
}: {
  boards: PublicBoard[];
  postCounts: Record<string, number>;
  totalCount: number;
  selectedBoardId?: string;
  onSelectBoard: (id: string) => void;
}) {
  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  }

return (
    <aside className="w-[240px] shrink-0 pr-0">
      {boards.length > 0 && (
        <div>
          <div className="px-2 text-[12px] tracking-wider text-muted-foreground/80 uppercase">
            Boards
          </div>
          <ul className="mt-2 flex flex-col">
            <li>
              <button
                onClick={() => onSelectBoard("all")}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-md px-2.5 h-8 transition-colors",
                  selectedBoardId === "all"
                    ? "bg-muted text-foreground"
                    : "text-foreground/85 hover:bg-muted/60",
                )}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: "hsl(var(--foreground))" }}
                />
                <span className="flex-1 text-left truncate" style={{ fontSize: "14px" }}>All Feedback</span>
                <span className="text-muted-foreground" style={{ fontSize: "13px" }}>{totalCount}</span>
              </button>
            </li>
            {boards.map((board, i) => (
              <li key={board.id}>
                <button
                  type="button"
                  onClick={() => onSelectBoard(board.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-md px-2.5 h-8 transition-colors",
                    selectedBoardId === board.id
                      ? "bg-muted text-foreground"
                      : "text-foreground/85 hover:bg-muted/60",
                  )}
                >
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: BOARD_COLORS[i % BOARD_COLORS.length] }} />
                  <span className="flex-1 text-left truncate" style={{ fontSize: "14px" }}>{board.name}</span>
                  <span className="text-muted-foreground" style={{ fontSize: "13px" }}>{postCounts[board.id] ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-7">
        <div className="px-2 text-[12px] tracking-wider text-muted-foreground/80 uppercase">
          Actions
        </div>
        <ul className="mt-2 flex flex-col">
          <li>
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-2.5 rounded-md px-2.5 h-9 text-[13px] text-foreground/80 hover:bg-muted/60 hover:text-foreground"
            >
              <Link2 className="h-3.5 w-3.5" />
              Copy link
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}

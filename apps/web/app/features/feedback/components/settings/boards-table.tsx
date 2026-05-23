import { cn } from "@lib/utils";
import { GripVertical, MoreVertical } from "lucide-react";
import { useState } from "react";
import type { FeedbackBoard } from "./types";

interface BoardsTableProps {
  boards: FeedbackBoard[];
  onChangeVisibility: (id: string, visibility: "public" | "private") => void;
  onUpdateSmartReplies: (id: string, enabled: boolean, instructions: string | null) => void;
  onUpdateAnonymizeUsers: (id: string, anonymizeUsers: boolean) => void;
}

const dotColor: Record<FeedbackBoard["color"], string> = {
  green: "bg-emerald-500",
  red: "bg-red-500",
  blue: "bg-sky-500",
  amber: "bg-amber-500",
};

function BoardRow({
  board,
  index,
  onChangeVisibility,
  onUpdateSmartReplies,
  onUpdateAnonymizeUsers,
}: {
  board: FeedbackBoard;
  index: number;
  onChangeVisibility: (id: string, visibility: "public" | "private") => void;
  onUpdateSmartReplies: (id: string, enabled: boolean, instructions: string | null) => void;
  onUpdateAnonymizeUsers: (id: string, anonymizeUsers: boolean) => void;
}) {
  const [instructions, setInstructions] = useState(board.smartRepliesInstructions ?? "");

  function handleSmartRepliesToggle(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdateSmartReplies(board.id, e.target.checked, instructions || null);
  }

  function handleInstructionsBlur() {
    onUpdateSmartReplies(board.id, board.smartRepliesEnabled, instructions || null);
  }

  return (
    <li className={cn(index !== 0 && "border-t border-border")}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical size={15} className="text-muted-foreground/40 cursor-grab shrink-0" />
        <span className={cn("h-2 w-2 rounded-full shrink-0", dotColor[board.color])} />

        {/* Board name + badges */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{board.name}</span>
          {board.isDefault && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
              default
            </span>
          )}
          {board.postCount > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
              {board.postCount} {board.postCount === 1 ? "post" : "posts"}
            </span>
          )}
        </div>

        {/* Smart Replies toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Smart Replies</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={board.smartRepliesEnabled}
              onChange={handleSmartRepliesToggle}
            />
            <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
          </label>
        </div>

        {/* Anonymize users toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Anonymize users</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={board.anonymizeUsers}
              onChange={(e) => onUpdateAnonymizeUsers(board.id, e.target.checked)}
            />
            <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
          </label>
        </div>

        {/* Visibility select */}
        <select
          value={board.visibility}
          onChange={(e) => onChangeVisibility(board.id, e.target.value as "public" | "private")}
          className={cn(
            "appearance-none bg-card text-foreground border border-border shrink-0",
            "rounded-md pl-3 pr-7 py-1.5 text-sm font-medium leading-none",
            "focus:outline-none focus:border-muted-foreground",
            "bg-no-repeat bg-[right_7px_center]",
          )}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23a3a3a3' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 4 18 9'/><polyline points='6 15 12 20 18 15'/></svg>\")",
          }}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>

        <button
          type="button"
          aria-label="More options"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
        >
          <MoreVertical size={15} />
        </button>
      </div>

      {/* Instructions — only shown when Smart Replies is on */}
      {board.smartRepliesEnabled && (
        <div className="px-4 pb-4 border-t border-border/50 bg-muted/10 pt-3 space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Custom instructions{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            onBlur={handleInstructionsBlur}
            placeholder="e.g. Always reply in a friendly tone. If the user mentions pricing, direct them to our sales team."
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-[11px] text-muted-foreground">
            Leave blank to use the default AI prompt. Custom instructions replace it entirely.
          </p>
        </div>
      )}
    </li>
  );
}

export function BoardsTable({
  boards,
  onChangeVisibility,
  onUpdateSmartReplies,
  onUpdateAnonymizeUsers,
}: BoardsTableProps) {
  if (boards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No boards yet. Create one below.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <ul>
        {boards.map((b, i) => (
          <BoardRow
            key={b.id}
            board={b}
            index={i}
            onChangeVisibility={onChangeVisibility}
            onUpdateSmartReplies={onUpdateSmartReplies}
            onUpdateAnonymizeUsers={onUpdateAnonymizeUsers}
          />
        ))}
      </ul>
    </div>
  );
}

import { cn } from "@lib/utils";
import { MoreVertical, Tag } from "lucide-react";
import * as React from "react";
import type { FeedbackTag } from "./types";

interface TagsTableProps {
  tags: FeedbackTag[];
}

export function TagsTable({ tags }: TagsTableProps) {
  if (tags.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
        No tags yet.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden bg-card">
      <div className="px-3 h-9 flex items-center bg-muted/30 border-b border-border">
        <div className="text-xs text-muted-foreground">Name</div>
      </div>
      <ul>
        {tags.map((t, i) => (
          <li
            key={t.id}
            className={cn(
              "flex items-center justify-between px-3 h-[42px] hover:bg-muted/20 transition-colors",
              i !== 0 && "border-t border-border",
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Tag size={12} className="text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground truncate">{t.name}</span>
            </div>
            <button
              type="button"
              aria-label="More options"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <MoreVertical size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

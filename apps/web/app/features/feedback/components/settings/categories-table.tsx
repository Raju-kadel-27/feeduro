import { cn } from "@lib/utils";
import { Trash2 } from "lucide-react";
import type { FeedbackCategory } from "./types";

interface CategoriesTableProps {
  categories: FeedbackCategory[];
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
}

export function CategoriesTable({ categories, isAdmin, onDelete }: CategoriesTableProps) {
  if (categories.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No categories yet.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden bg-card">
      <div className="px-3 h-9 flex items-center bg-muted/30 border-b border-border">
        <div className="text-sm text-muted-foreground">Name</div>
      </div>
      <ul>
        {categories.map((c, i) => (
          <li
            key={c.id}
            className={cn(
              "flex items-center justify-between px-3 h-[42px] hover:bg-muted/20 transition-colors",
              i !== 0 && "border-t border-border",
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: c.color }}
              />
              <span className="text-sm text-foreground truncate">{c.name}</span>
            </div>
            {isAdmin && onDelete && (
              <button
                type="button"
                aria-label={`Delete category ${c.name}`}
                onClick={() => onDelete(c.id)}
                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

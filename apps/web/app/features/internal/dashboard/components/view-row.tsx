import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@components/ui/alert-dialog";
import { buttonVariants } from "@components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/ui/tooltip";
import type { Board, Category, Sort, Tag, View, ViewFilters } from "@features/internal/dashboard/types";
import type { Segment } from "@features/internal/segmentation/types";
import { cn } from "@lib/utils";
import { Pencil, Trash2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  open: "Pending",
  reviewing: "Reviewing",
  planned: "Planned",
  "in-progress": "In Progress",
  completed: "Completed",
  closed: "Closed",
};

const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  oldest: "Oldest",
  votes: "Most votes",
  trending: "Trending",
  revenue: "Revenue impact",
};

function summarize(
  filters: ViewFilters,
  sort: Sort,
  boards: Board[],
  tags: Tag[],
  categories: Category[],
  segments: Segment[],
): string {
  const parts: string[] = [];
  if (filters.status?.length)
    parts.push(`Status: ${filters.status.map((s) => STATUS_LABELS[s] ?? s).join(", ")}`);
  if (filters.board?.length) {
    const names = filters.board.map((id) => boards.find((b) => b.id === id)?.name ?? id);
    parts.push(`Board: ${names.join(", ")}`);
  }
  if (filters.tagIds?.length) {
    const names = filters.tagIds.map((id) => tags.find((t) => t.id === id)?.name ?? id);
    parts.push(`Tags: ${names.join(", ")}`);
  }
  if (filters.categoryId?.length) {
    const names = filters.categoryId.map((id) => categories.find((c) => c.id === id)?.name ?? id);
    parts.push(`Category: ${names.join(", ")}`);
  }
  if (filters.segmentId) {
    const seg = segments.find((s) => s.id === filters.segmentId);
    if (seg) parts.push(`Segment: ${seg.name}`);
  }
  if (filters.hasCustomerComment) parts.push("Customer commented");
  if (filters.hasComments) parts.push("Has comments");
  if (sort !== "newest") parts.push(`Sort: ${SORT_LABELS[sort] ?? sort}`);
  return parts.join(" · ") || "All posts";
}

interface ViewRowProps {
  view: View;
  boards: Board[];
  tags: Tag[];
  categories: Category[];
  segments: Segment[];
  onEdit: (view: View) => void;
  onDelete: (viewId: string) => void;
  isDeleting?: boolean;
}

export function ViewRow({
  view,
  boards,
  tags,
  categories,
  segments,
  onEdit,
  onDelete,
  isDeleting,
}: ViewRowProps) {
  const summary = summarize(view.filters, view.sort, boards, tags, categories, segments);

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors",
          isDeleting ? "pointer-events-none opacity-50" : "hover:bg-muted/30",
        )}
      >
        <span className="text-lg w-8 text-center shrink-0 leading-none">{view.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{view.name}</span>
            {view.isSystem && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium shrink-0">
                Built-in
              </span>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-[12px] text-muted-foreground mt-0.5 truncate cursor-default">
                {summary}
              </p>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-center">
              {summary}
            </TooltipContent>
          </Tooltip>
        </div>
        {!view.isSystem && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onEdit(view)}
                  className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Edit view"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Delete view"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{view.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This view will be permanently removed from the sidebar. This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className={buttonVariants({ variant: "destructive" })}
                    onClick={() => onDelete(view.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

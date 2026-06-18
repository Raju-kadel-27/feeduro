import { Button } from "@components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import type { Board, Category, Sort, Tag, View, ViewFilters } from "@features/internal/dashboard/types";
import type { Segment } from "@features/internal/segmentation/types";
import { useEffect, useState } from "react";
import { EmojiPicker } from "./emoji-picker";
import { EMPTY_FILTER_STATE, type FilterState, ViewFilterFields } from "./view-filter-fields";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialView?: View;
  boards: Board[];
  tags: Tag[];
  categories: Category[];
  segments: Segment[];
  onSave: (data: { name: string; emoji: string; sort: Sort; filters: ViewFilters }) => void;
  isPending: boolean;
}

export function ViewFormDialog({
  open,
  onOpenChange,
  initialView,
  boards,
  tags,
  categories,
  segments,
  onSave,
  isPending,
}: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📌");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTER_STATE);

  useEffect(() => {
    if (!open) return;
    const f = initialView?.filters ?? {};
    setName(initialView?.name ?? "");
    setEmoji(initialView?.emoji ?? "📌");
    setFilters({
      sort: initialView?.sort ?? "newest",
      status: (f.status ?? []) as FilterState["status"],
      board: f.board ?? [],
      tagIds: f.tagIds ?? [],
      categoryId: f.categoryId ?? [],
      segmentId: f.segmentId,
      hasCustomerComment: f.hasCustomerComment ?? false,
      hasComments: f.hasComments ?? false,
    });
  }, [open, initialView]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const viewFilters: ViewFilters = {};
    if (filters.status.length) viewFilters.status = filters.status;
    if (filters.board.length) viewFilters.board = filters.board;
    if (filters.tagIds.length) viewFilters.tagIds = filters.tagIds;
    if (filters.categoryId.length) viewFilters.categoryId = filters.categoryId;
    if (filters.segmentId) viewFilters.segmentId = filters.segmentId;
    if (filters.hasCustomerComment) viewFilters.hasCustomerComment = true;
    if (filters.hasComments) viewFilters.hasComments = true;
    onSave({ name: name.trim(), emoji: emoji || "📌", sort: filters.sort, filters: viewFilters });
  }

  function handleFilterChange<K extends keyof FilterState>(key: K, val: FilterState[K]) {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialView ? "Edit view" : "New view"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Icon
              </p>
              <EmojiPicker value={emoji} onChange={setEmoji} />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label
                htmlFor="view-name"
                className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Name
              </label>
              <Input
                id="view-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. High priority bugs"
                autoFocus
                required
              />
            </div>
          </div>
          <ViewFilterFields
            state={filters}
            onChange={handleFilterChange}
            boards={boards}
            tags={tags}
            categories={categories}
            segments={segments}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending ? "Saving…" : initialView ? "Save changes" : "Create view"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

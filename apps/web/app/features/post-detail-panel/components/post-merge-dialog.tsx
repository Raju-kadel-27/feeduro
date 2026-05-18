import type { AdminStatus, MergeSearchPost } from "@features/feedback/schemas/admin";
import { Search } from "lucide-react";
import { StatusCircleIcon } from "./status-circle-icon";

export function PostMergeDialog({
  postTitle,
  mergeStep,
  mergeSearch,
  mergeTarget,
  mergeResults,
  searchingPosts,
  merging,
  onSearchChange,
  onSelectTarget,
  onBack,
  onConfirm,
  onCancel,
}: {
  postTitle: string;
  mergeStep: "search" | "confirm";
  mergeSearch: string;
  mergeTarget: MergeSearchPost | null;
  mergeResults: MergeSearchPost[];
  searchingPosts: boolean;
  merging: boolean;
  onSearchChange: (v: string) => void;
  onSelectTarget: (p: MergeSearchPost) => void;
  onBack: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-[70] -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-popover border rounded-xl shadow-xl p-6">
        {mergeStep === "search" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Merge into another post</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Votes and comments will be combined on the target post. This can be undone.
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={mergeSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search posts…"
                autoFocus
                className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto -mx-1 px-1">
              {searchingPosts && (
                <p className="text-xs text-muted-foreground py-4 text-center">Searching…</p>
              )}
              {!searchingPosts && mergeResults.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">No posts found.</p>
              )}
              {mergeResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectTarget(p)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-muted text-left transition-colors"
                >
                  <StatusCircleIcon status={p.status as AdminStatus} size={14} />
                  <span className="flex-1 text-sm truncate">{p.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {p.voteCount} votes
                  </span>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-medium rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {mergeStep === "confirm" && mergeTarget && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Confirm merge</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                This will merge <span className="font-medium text-foreground">"{postTitle}"</span>{" "}
                into <span className="font-medium text-foreground">"{mergeTarget.title}"</span>.
                Votes and comments will be consolidated. This can be undone.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 text-xs font-medium rounded-lg hover:bg-muted transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={merging}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {merging ? "Merging…" : "Confirm merge"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

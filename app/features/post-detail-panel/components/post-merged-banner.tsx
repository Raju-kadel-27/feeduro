import { GitMerge } from "lucide-react";

export function PostMergedBanner({
  title,
  targetId,
  isAdmin,
  canUnmerge,
  unmerging,
  onOpenPost,
  onUnmerge,
}: {
  title: string;
  targetId: string;
  isAdmin: boolean;
  canUnmerge: boolean;
  unmerging: boolean;
  onOpenPost?: (id: string) => void;
  onUnmerge: () => void;
}) {
  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
      <GitMerge className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-violet-800 dark:text-violet-200">
          Merged into{" "}
          <button
            type="button"
            onClick={() => onOpenPost?.(targetId)}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            {title}
          </button>
        </p>
      </div>
      {isAdmin && canUnmerge && (
        <button
          type="button"
          onClick={onUnmerge}
          disabled={unmerging}
          className="shrink-0 px-2.5 py-1 text-xs font-medium rounded border border-violet-300 text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
        >
          {unmerging ? "Unmerging…" : "Unmerge"}
        </button>
      )}
    </div>
  );
}

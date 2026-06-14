import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command";
import { Dialog, DialogContent } from "@components/ui/dialog";
import { cn } from "@lib/utils";
import { ArrowUp, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Board } from "../types";
import type { SearchResult } from "@features/feedback/server/search";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  reviewing: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  planned: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "in-progress": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Pending",
  reviewing: "Reviewing",
  planned: "Planned",
  "in-progress": "In Progress",
  completed: "Completed",
  closed: "Closed",
};

interface FeedbackSearchModalProps {
  boards: Board[];
  open: boolean;
  onClose: () => void;
  onOpen: (postId: string) => void;
}

export function FeedbackSearchModal({ boards, open, onClose, onOpen }: FeedbackSearchModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const boardMap = Object.fromEntries(boards.map((b) => [b.id, b.name]));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
      .then((r) => r.json())
      .then((d: { results: SearchResult[] }) => {
        if (!cancelled) setResults(d.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
      setResults([]);
    }
  }, [open]);

  function handleSelect(postId: string) {
    onOpen(postId);
    onClose();
  }

  const showEmpty = !loading && debouncedQuery.trim().length >= 2 && results.length === 0;
  const showHint = debouncedQuery.trim().length < 2;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="overflow-hidden p-0 shadow-lg max-w-lg">
        <Command
          shouldFilter={false}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4"
        >
          <CommandInput
            placeholder="Search feedback..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {showHint && !loading && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search…
              </div>
            )}
            {showEmpty && <CommandEmpty>No results found.</CommandEmpty>}
            {!loading && results.length > 0 && (
              <CommandGroup heading="Feedback">
                {results.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={r.id}
                    onSelect={() => handleSelect(r.id)}
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    <span className="flex-1 truncate text-sm">{r.title}</span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium shrink-0",
                        STATUS_COLORS[r.status] ?? "bg-muted text-muted-foreground",
                      )}
                    >
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground shrink-0">
                      <ArrowUp className="h-3 w-3" />
                      {r.voteCount}
                    </span>
                    {boardMap[r.boardId] && (
                      <span className="text-xs text-muted-foreground shrink-0 max-w-[100px] truncate">
                        {boardMap[r.boardId]}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

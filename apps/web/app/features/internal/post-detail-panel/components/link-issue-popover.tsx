import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type SearchResult, useSearchIssues } from "../hooks/use-search-issues";

const PLACEHOLDERS: Record<string, string> = {
  jira: "PROJ-42 or paste URL…",
  linear: "ENG-123 or issue ID…",
  asana: "Task GID or paste URL…",
};

const ACCENT: Record<string, string> = { jira: "#2684FF", linear: "#5E6AD2", asana: "#F06A6A" };

export function LinkIssuePopover({
  provider, linking, triggerLabel = "Link issue", onLink,
}: {
  provider: "jira" | "linear" | "asana";
  linking: boolean;
  triggerLabel?: string;
  onLink: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pasteValue, setPasteValue] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const { results, loading, error } = useSearchIssues(provider, query, open);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    else { setQuery(""); setPasteValue(""); }
  }, [open]);

  function handleSelect(result: SearchResult) { onLink(result.id); setOpen(false); }
  function handlePasteLink() {
    const v = pasteValue.trim();
    if (v) { onLink(v); setOpen(false); }
  }

  const accent = ACCENT[provider] ?? "#6366f1";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" disabled={linking}
          className="text-muted-foreground underline hover:text-foreground transition-colors text-xs disabled:opacity-50">
          {linking ? "Linking…" : triggerLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-[60]" align="start" side="bottom" sideOffset={6}>
        {/* Search row */}
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or key…"
            className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0" />}
        </div>

        {/* Search results */}
        <div className="max-h-52 overflow-y-auto">
          {error && <p className="px-3 py-3 text-xs text-destructive text-center">{error}</p>}
          {!error && !loading && query.trim() && results.length === 0 && (
            <p className="px-3 py-3 text-xs text-muted-foreground text-center">No results found</p>
          )}
          {!error && !query.trim() && (
            <p className="px-3 py-3 text-xs text-muted-foreground text-center">Type to search…</p>
          )}
          {results.map((r) => (
            <button key={r.id} type="button" onClick={() => handleSelect(r)}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors text-left group">
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold font-mono shrink-0" style={{ color: accent }}>
                    {r.identifier}
                  </span>
                  {r.status && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-medium text-muted-foreground shrink-0">
                      {r.status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground truncate leading-snug">{r.title}</p>
              </div>
              {r.url && (
                <a href={r.url} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </button>
          ))}
        </div>

        {/* Paste URL / key */}
        <div className="border-t px-3 py-2 space-y-1.5">
          <p className="text-[10px] text-muted-foreground font-medium">Or paste URL / issue key</p>
          <div className="flex items-center gap-1.5">
            <input value={pasteValue} onChange={(e) => setPasteValue(e.target.value)}
              placeholder={PLACEHOLDERS[provider]}
              onKeyDown={(e) => e.key === "Enter" && handlePasteLink()}
              className="flex-1 h-7 px-2 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="button" onClick={handlePasteLink} disabled={!pasteValue.trim()}
              className="h-7 px-2.5 text-xs font-medium bg-primary text-primary-foreground rounded disabled:opacity-40 shrink-0">
              Link
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

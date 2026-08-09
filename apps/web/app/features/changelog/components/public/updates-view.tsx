import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover";
import { ChangelogSearchInput } from "@features/changelog/components/changelog-search-input";
import type { PublicChangelog } from "@features/feedback/schemas/public";
import { useInfiniteScroll } from "@hooks/use-infinite-scroll";
import { cn } from "@lib/utils";
import { Check, CheckCircle2, ChevronDown, Loader2, MailIcon, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { UpdateEntry } from "./update-entry";

type ChangelogFilter = "All" | "Features" | "Improvements" | "Fixes" | "API";
const FILTERS: ChangelogFilter[] = ["All", "Features", "Improvements", "Fixes", "API"];

interface Props {
  entries: PublicChangelog[];
  initialNextCursor: string | null;
  orgId: string;
  orgSlug: string;
  subscriptionsEnabled: boolean;
  isSubscribed: boolean;
  userEmail: string | null;
  onAuthRequired: () => void;
}

function applyTagFilter(entries: PublicChangelog[], filter: ChangelogFilter): PublicChangelog[] {
  if (filter === "All") return entries;
  return entries.filter((e) => {
    const tags = (e.tags ?? []).map((t) => t.toLowerCase());
    if (filter === "Features") return tags.includes("feature");
    if (filter === "Improvements") return tags.includes("improvement");
    if (filter === "Fixes") return tags.includes("fix");
    if (filter === "API") return tags.includes("api");
    return true;
  });
}

export function UpdatesView({
  entries,
  initialNextCursor,
  orgId,
  orgSlug,
  subscriptionsEnabled,
  isSubscribed,
  userEmail,
  onAuthRequired,
}: Props) {
  const [filter, setFilter] = useState<ChangelogFilter>("All");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [allEntries, setAllEntries] = useState<PublicChangelog[]>(entries);
  const [cursor, setCursor] = useState<string | null>(initialNextCursor);
  const [isFetching, setIsFetching] = useState(false);
  const [subStatus, setSubStatus] = useState<"idle" | "loading" | "success" | "error">(
    isSubscribed ? "success" : "idle",
  );

  const initialEntriesRef = useRef(entries);
  const initialCursorRef = useRef(initialNextCursor);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Server-side search: reset + fetch when debounced search changes
  useEffect(() => {
    if (debouncedSearch === "") {
      setAllEntries(initialEntriesRef.current);
      setCursor(initialCursorRef.current);
      return;
    }
    let cancelled = false;
    setIsFetching(true);
    const params = new URLSearchParams({ orgSlug, search: debouncedSearch });
    fetch(`/api/public-changelogs?${params}`)
      .then((r) => r.json() as Promise<{ entries: PublicChangelog[]; nextCursor: string | null }>)
      .then((d) => {
        if (!cancelled) {
          setAllEntries(d.entries);
          setCursor(d.nextCursor);
          setIsFetching(false);
        }
      })
      .catch(() => { if (!cancelled) setIsFetching(false); });
    return () => { cancelled = true; };
  }, [debouncedSearch, orgSlug]);

  async function loadMore() {
    if (!cursor || isFetching) return;
    setIsFetching(true);
    try {
      const params = new URLSearchParams({ orgSlug, limit: "10" });
      params.set("cursor", cursor);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/public-changelogs?${params}`);
      const d = (await res.json()) as { entries: PublicChangelog[]; nextCursor: string | null };
      setAllEntries((prev) => [...prev, ...d.entries]);
      setCursor(d.nextCursor);
    } finally {
      setIsFetching(false);
    }
  }

  const sentinelRef = useInfiniteScroll(loadMore, { enabled: !!cursor && !isFetching });

  const visible = applyTagFilter(allEntries, filter);

  const pillClass =
    "inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md px-2.5 py-1 disabled:opacity-50 disabled:cursor-not-allowed";

  async function handleSubscribe() {
    if (!userEmail) { onAuthRequired(); return; }
    if (subStatus === "loading" || subStatus === "success") return;
    setSubStatus("loading");
    try {
      const res = await fetch("/api/changelog-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, orgSlug }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to subscribe");
      setSubStatus("success");
    } catch {
      setSubStatus("error");
      setTimeout(() => setSubStatus("idle"), 3000);
    }
  }

  return (
    <section className="min-w-0 flex-1">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Changelogs</h1>
          <div className="flex items-center gap-3 mt-1 mb-2">
            <p className="text-base text-muted-foreground">Follow up on the latest improvements and updates.</p>
            {subscriptionsEnabled && (
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={subStatus === "loading" || subStatus === "success"}
                className={cn(pillClass, subStatus === "success" && "text-emerald-600 border-emerald-200 hover:text-emerald-600")}
              >
                {subStatus === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {subStatus === "success" && <CheckCircle2 className="h-3.5 w-3.5" />}
                {subStatus === "idle" && <MailIcon className="h-3.5 w-3.5" />}
                {subStatus === "error" && <MailIcon className="h-3.5 w-3.5 text-destructive" />}
                {subStatus === "success" ? "Subscribed" : subStatus === "error" ? "Try again" : "Subscribe"}
              </button>
            )}
          </div>
          <ChangelogSearchInput value={search} onChange={setSearch} size="sm" className="mt-1 w-80" />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 h-7 px-2.5 rounded-md border text-[13px] font-medium transition-colors",
                filter !== "All"
                  ? "border-foreground/40 bg-muted text-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
            >
              <SlidersHorizontal className="h-3 w-3" />
              Filter
              {filter !== "All" && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-[11px] font-bold">1</span>
              )}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={6} className="p-1 w-40">
            <p className="px-2.5 pt-1 pb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</p>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[13.5px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <span className={cn("h-3 w-3 rounded-sm border flex items-center justify-center shrink-0 transition-colors", filter === f ? "bg-foreground border-foreground" : "border-border")}>
                  {filter === f && <Check className="h-2 w-2 text-background" />}
                </span>
                <span className={cn(filter === f && "text-foreground font-medium")}>{f}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {isFetching && allEntries.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-base text-muted-foreground">
          No changelogs found.
        </div>
      ) : (
        <div style={{ paddingTop: 8 }}>
          {visible.map((entry, i) => (
            <UpdateEntry
              key={entry.id}
              entry={entry}
              isLast={i === visible.length - 1 && !cursor}
              orgId={orgId}
              orgSlug={orgSlug}
              userEmail={userEmail}
              onAuthRequired={onAuthRequired}
            />
          ))}
          <div ref={sentinelRef} />
          {isFetching && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

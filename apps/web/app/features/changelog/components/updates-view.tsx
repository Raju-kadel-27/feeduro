import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover";
import type { PublicChangelog } from "@features/feedback/schemas/public";
import { cn } from "@lib/utils";
import { Check, ChevronDown, MailIcon, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { UpdateEntry } from "./update-entry";

type ChangelogFilter = 'All' | 'Features' | 'Improvements' | 'Fixes' | 'API';
const FILTERS: ChangelogFilter[] = ['All', 'Features', 'Improvements', 'Fixes', 'API'];

interface Props {
  entries: PublicChangelog[];
  orgSlug: string;
  subscriptionsEnabled: boolean;
}

function applyFilters(entries: PublicChangelog[], filter: ChangelogFilter, search: string): PublicChangelog[] {
  let result = entries;
  if (filter !== 'All') {
    result = result.filter((e) => {
      const tags = (e.tags ?? []).map((t) => t.toLowerCase());
      if (filter === 'Features') return tags.includes('feature');
      if (filter === 'Improvements') return tags.includes('improvement');
      if (filter === 'Fixes') return tags.includes('fix');
      if (filter === 'API') return tags.includes('api');
      return true;
    });
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    result = result.filter((e) => e.title.toLowerCase().includes(q));
  }
  return result;
}

function SubscribeForm({ orgSlug }: { orgSlug: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/changelog-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), orgSlug }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed to subscribe');
      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-lg border bg-muted/40 px-5 py-4 text-sm text-muted-foreground mb-6">
        <MailIcon className="inline-block h-4 w-4 mr-1.5 align-middle" />
        You&apos;re subscribed! We&apos;ll email you when a new update is published.
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-5 mb-6">
      <p className="text-sm font-medium mb-1">Subscribe to updates</p>
      <p className="text-xs text-muted-foreground mb-3">Get an email whenever a new update is published.</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }} placeholder="you@example.com" required className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        <button type="submit" disabled={status === 'loading' || !email.trim()} className="px-4 py-1.5 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50">
          {status === 'loading' ? '…' : 'Subscribe'}
        </button>
      </form>
      {status === 'error' && <p className="mt-2 text-xs text-destructive">{errorMsg}</p>}
    </div>
  );
}

export function UpdatesView({ entries, orgSlug, subscriptionsEnabled }: Props) {
  const [filter, setFilter] = useState<ChangelogFilter>('All');
  const [search, setSearch] = useState('');
  const visible = applyFilters(entries, filter, search);

  return (
    <section className="min-w-0 flex-1">
      {subscriptionsEnabled && <SubscribeForm orgSlug={orgSlug} />}

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Changelog</h1>
          <div className="flex items-center gap-3 mt-1 mb-2">
            <p className="text-[13px] text-muted-foreground">Follow up on the latest improvements and updates.</p>
            <a href="/rss.xml" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-1.5 py-0.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20C4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z"/></svg>
              RSS
            </a>
          </div>
          <div className="relative mt-1 w-80">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search changelogs..."
              className="h-7 w-full rounded-md border border-border bg-background pl-7 pr-3 text-[12px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 h-7 px-2.5 rounded-md border text-[12px] font-medium transition-colors",
                filter !== 'All'
                  ? "border-foreground/40 bg-muted text-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
            >
              <SlidersHorizontal className="h-3 w-3" />
              Filter
              {filter !== 'All' && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-bold">1</span>
              )}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={6} className="p-1 w-40">
            <p className="px-2.5 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Category</p>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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

      {visible.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          No changelogs found.
        </div>
      ) : (
        <div style={{ paddingTop: 8 }}>
          {visible.map((entry, i) => (
            <UpdateEntry key={entry.id} entry={entry} isLast={i === visible.length - 1} />
          ))}
        </div>
      )}
    </section>
  );
}

import { ThemeToggle } from "@features/internal/layout/components/theme-toggle";
import { LandingFooter } from "@features/public/landing/components/landing-footer";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { DocsContent } from "./docs-content";
import { NAV, PAGES } from "./docs-data";
import { DocsSearch } from "./docs-search";
import { DocsToc } from "./docs-toc";

type FlatPage = { id: string; title: string; group: string };

const FLAT_PAGES: FlatPage[] = NAV.flatMap((g) =>
  g.items.map((item) => ({ ...item, group: g.label })),
);

function DocsSidebar({
  activeId,
  onSelect,
  onSearchOpen,
}: {
  activeId: string;
  onSelect: (id: string) => void;
  onSearchOpen: () => void;
}) {
  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border">
      <div className="sticky top-0 flex h-screen flex-col gap-5 overflow-y-hidden hover:overflow-y-auto px-4 pt-6 pb-12">
        {/* Search trigger */}
        <button
          type="button"
          onClick={onSearchOpen}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted"
        >
          <Search size={12} className="shrink-0" />
          <span className="flex-1">Search docs...</span>
          <kbd className="rounded border border-border bg-background px-1 font-mono text-[10px]">⌘K</kbd>
        </button>

        {NAV.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {group.label}
            </p>
            <ul>
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={activeId === item.id ? "page" : undefined}
                    onClick={() => onSelect(item.id)}
                    className={`w-full border-l-2 py-1.5 pl-2.5 pr-2 text-left text-sm transition-colors ${
                      activeId === item.id
                        ? "border-primary font-medium text-foreground"
                        : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}

function MobileNav({
  activeId,
  onSelect,
  onSearchOpen,
}: {
  activeId: string;
  onSelect: (id: string) => void;
  onSearchOpen: () => void;
}) {
  return (
    <div className="lg:hidden mb-6 space-y-3">
      <button
        type="button"
        onClick={onSearchOpen}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search size={12} className="shrink-0" />
        <span className="flex-1">Search docs...</span>
        <kbd className="rounded border border-border bg-background px-1 font-mono text-[10px]">⌘K</kbd>
      </button>
      <nav aria-label="Docs navigation" className="-mx-4 overflow-x-auto px-4">
        <div className="flex min-w-max gap-2 pb-2">
          {FLAT_PAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={activeId === item.id ? "page" : undefined}
              onClick={() => onSelect(item.id)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
                activeId === item.id
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function DocsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);

  const topicParam = searchParams.get("topic") ?? "overview";
  const activeId = PAGES[topicParam] ? topicParam : "overview";
  const page = PAGES[activeId];

  const handleSelect = (id: string) => {
    setSearchParams({ topic: id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const currentIndex = FLAT_PAGES.findIndex((p) => p.id === activeId);
  const currentGroup = FLAT_PAGES[currentIndex]?.group ?? "";
  const prevPage = FLAT_PAGES[currentIndex - 1] ?? null;
  const nextPage = FLAT_PAGES[currentIndex + 1] ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <DocsSidebar
        activeId={activeId}
        onSelect={handleSelect}
        onSearchOpen={() => setSearchOpen(true)}
      />

      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1024px] px-4 sm:px-6">
          <header className="mt-8 flex items-end justify-between gap-4 border-b border-border py-8">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Feeduro
              </p>
              <h1 className="text-3xl font-bold tracking-tight">Docs</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Configuration guides and technical reference.
              </p>
            </div>
            <ThemeToggle large className="mb-1 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground" />
          </header>

          <div className="flex gap-8 py-8">
            <main className="min-w-0 flex-1 pb-20">
              <MobileNav
                activeId={activeId}
                onSelect={handleSelect}
                onSearchOpen={() => setSearchOpen(true)}
              />
              {page && (
                <DocsContent
                  page={page}
                  groupLabel={currentGroup}
                  prevPage={prevPage}
                  nextPage={nextPage}
                  onNavigate={handleSelect}
                />
              )}
            </main>
            {page && <DocsToc page={page} />}
          </div>
        </div>

        <LandingFooter />
      </div>

      <DocsSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={handleSelect}
      />
    </div>
  );
}

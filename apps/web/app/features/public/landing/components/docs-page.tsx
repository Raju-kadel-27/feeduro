import { LandingFooter } from "@features/public/landing/components/landing-footer";
import { LandingNav } from "@features/public/landing/components/landing-nav";
import { useState } from "react";
import { DocsContent } from "./docs-content";
import { NAV, PAGES } from "./docs-data";

type FlatPage = { id: string; title: string; group: string };

const FLAT_PAGES: FlatPage[] = NAV.flatMap((g) =>
  g.items.map((item) => ({ ...item, group: g.label })),
);

function DocsSidebar({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="hidden lg:flex w-52 shrink-0 flex-col border-r border-border">
      <div className="sticky top-24 flex flex-col gap-6 overflow-y-auto pb-12 pr-6 max-h-[calc(100vh-7rem)]">
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
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="lg:hidden mb-8 -mx-4 px-4 overflow-x-auto" aria-label="Docs navigation">
      <div className="flex gap-2 pb-2 min-w-max">
        {FLAT_PAGES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
              activeId === item.id
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>
    </nav>
  );
}

export function DocsPage() {
  const [activeId, setActiveId] = useState("overview");
  const page = PAGES[activeId];

  const currentIndex = FLAT_PAGES.findIndex((p) => p.id === activeId);
  const currentGroup = FLAT_PAGES[currentIndex]?.group ?? "";
  const prevPage = FLAT_PAGES[currentIndex - 1] ?? null;
  const nextPage = FLAT_PAGES[currentIndex + 1] ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <div className="mx-auto max-w-[1080px] px-4 sm:px-6">
        <header className="mt-16 border-b border-border py-10">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Feeduro
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Docs</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Configuration guides and technical reference.
          </p>
        </header>
        <div className="flex gap-12 py-8">
          <DocsSidebar activeId={activeId} onSelect={setActiveId} />
          <main className="min-w-0 flex-1 pb-20">
            <MobileNav activeId={activeId} onSelect={setActiveId} />
            {page && (
              <DocsContent
                page={page}
                groupLabel={currentGroup}
                prevPage={prevPage}
                nextPage={nextPage}
                onNavigate={setActiveId}
              />
            )}
          </main>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
}

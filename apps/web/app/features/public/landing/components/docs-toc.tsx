import { useEffect, useState } from "react";
import type { ContentBlock, DocPage } from "./docs-data";

export function DocsToc({ page }: { page: DocPage }) {
  const steps = page.blocks.filter(
    (b): b is Extract<ContentBlock, { type: "step" }> => b.type === "step",
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setActiveId(null);

    const stepEls = page.blocks
      .filter((b): b is Extract<ContentBlock, { type: "step" }> => b.type === "step")
      .map((s) => document.getElementById(`step-${s.number}`))
      .filter((el): el is HTMLElement => el !== null);

    if (!stepEls.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-10% 0% -65% 0%", threshold: 0 },
    );

    for (const el of stepEls) observer.observe(el);
    return () => observer.disconnect();
  }, [page]);

  if (!steps.length) return null;

  return (
    <aside className="hidden xl:block w-36 shrink-0">
      <div className="sticky top-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          On this page
        </p>
        <ul className="space-y-0.5 border-l border-border">
          {steps.map((s) => {
            const id = `step-${s.number}`;
            const active = activeId === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById(id)?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                  className={`-ml-px w-full border-l-2 py-1.5 pl-3 text-left text-sm leading-snug transition-colors ${
                    active
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {s.title}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

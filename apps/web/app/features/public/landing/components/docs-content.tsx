import {
  Bell,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  Code2,
  Columns3,
  Edit3,
  EyeOff,
  Globe,
  Info,
  Lock,
  Map,
  MessageCircle,
  MessageSquare,
  Package,
  Palette,
  Plug,
  Puzzle,
  Tag,
  ThumbsUp,
} from "lucide-react";
import type { ContentBlock, DocPage } from "./docs-data";

type LucideIcon = React.ComponentType<{ size?: number; className?: string }>;

const ICON_MAP: Record<string, LucideIcon> = {
  Bell, BookOpen, Calendar, Clock, Code2, Columns3, Edit3, EyeOff,
  Globe, Lock, Map, MessageCircle, MessageSquare, Package, Palette,
  Plug, Puzzle, Tag, ThumbsUp,
};

type NavLink = { id: string; title: string; group: string } | null;

function Block({ block, nextBlock }: { block: ContentBlock; nextBlock?: ContentBlock }) {
  switch (block.type) {
    case "text":
      return <p className="text-sm leading-relaxed text-foreground/80">{block.body}</p>;

    case "step": {
      const continues = nextBlock?.type === "step";
      return (
        <div className="flex gap-4">
          <div className="flex shrink-0 flex-col items-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20">
              {block.number}
            </div>
            {continues && <div className="mt-2 w-px flex-1 min-h-8 bg-border" />}
          </div>
          <div className={`min-w-0 ${continues ? "pb-6" : ""}`}>
            <p className="mb-1 text-sm font-semibold text-foreground">{block.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{block.body}</p>
          </div>
        </div>
      );
    }

    case "code":
      return (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="border-b border-zinc-800 px-4 py-2.5">
            <span className="font-mono text-[11px] text-zinc-500">{block.lang}</span>
          </div>
          <pre className="overflow-x-auto px-5 py-4 font-mono text-[13px] leading-relaxed text-zinc-200 whitespace-pre">
            {block.code}
          </pre>
        </div>
      );

    case "note":
      return (
        <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <Info size={15} className="mt-0.5 shrink-0 text-primary/60" />
          <p className="text-sm leading-relaxed text-foreground/70">{block.body}</p>
        </div>
      );

    case "grid":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {block.items.map((item) => {
            const Icon = ICON_MAP[item.icon];
            return (
              <div
                key={item.title}
                className="rounded-xl border border-border p-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
              >
                {Icon && (
                  <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8">
                    <Icon size={15} className="text-primary/70" />
                  </div>
                )}
                <p className="mb-1 text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            );
          })}
        </div>
      );

    default:
      return null;
  }
}

export function DocsContent({
  page,
  groupLabel,
  prevPage,
  nextPage,
  onNavigate,
}: {
  page: DocPage;
  groupLabel: string;
  prevPage: NavLink;
  nextPage: NavLink;
  onNavigate: (id: string) => void;
}) {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Docs</span>
        <ChevronRight size={12} className="shrink-0" />
        <span>{groupLabel}</span>
        <ChevronRight size={12} className="shrink-0" />
        <span className="text-foreground font-medium">{page.title}</span>
      </div>

      {/* Page header */}
      <div className="mb-8 border-b border-border pb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{page.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{page.description}</p>
      </div>

      {/* Content blocks */}
      <div className="space-y-5">
        {page.blocks.map((block, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static ordered content
          <Block key={i} block={block} nextBlock={page.blocks[i + 1]} />
        ))}
      </div>

      {/* Prev / Next navigation */}
      <div className="mt-16 border-t border-border pt-6 flex items-stretch justify-between gap-4">
        {prevPage ? (
          <button
            type="button"
            onClick={() => onNavigate(prevPage.id)}
            className="group flex flex-col gap-0.5 rounded-xl border border-border px-5 py-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/30 max-w-[48%]"
          >
            <span className="text-[11px] text-muted-foreground">← Previous</span>
            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
              {prevPage.title}
            </span>
            <span className="text-[11px] text-muted-foreground">{prevPage.group}</span>
          </button>
        ) : <div />}

        {nextPage && (
          <button
            type="button"
            onClick={() => onNavigate(nextPage.id)}
            className="group flex flex-col gap-0.5 rounded-xl border border-border px-5 py-4 text-right transition-colors hover:border-primary/30 hover:bg-muted/30 max-w-[48%] ml-auto"
          >
            <span className="text-[11px] text-muted-foreground">Next →</span>
            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
              {nextPage.title}
            </span>
            <span className="text-[11px] text-muted-foreground">{nextPage.group}</span>
          </button>
        )}
      </div>
    </div>
  );
}

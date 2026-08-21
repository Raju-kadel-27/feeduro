import {
  Bell,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Code2,
  Columns3,
  Copy,
  Edit3,
  EyeOff,
  Globe,
  Info,
  Link as LinkIcon,
  Lock,
  Map,
  MessageCircle,
  MessageSquare,
  Package,
  Palette,
  Plug,
  Puzzle,
  Tag,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ContentBlock, DocPage } from "./docs-data";

type LucideIcon = React.ComponentType<{ size?: number; className?: string }>;

const ICON_MAP: Record<string, LucideIcon> = {
  Bell, BookOpen, Calendar, Clock, Code2, Columns3, Edit3, EyeOff,
  Globe, Lock, Map, MessageCircle, MessageSquare, Package, Palette,
  Plug, Puzzle, Tag, ThumbsUp,
};

type NavLink = { id: string; title: string; group: string } | null;

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handle = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [code]);
  return (
    <button
      type="button"
      onClick={handle}
      aria-label="Copy code"
      className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function HelpfulWidget({ pageId }: { pageId: string }) {
  const [voted, setVoted] = useState<"yes" | "no" | null>(null);

  useEffect(() => {
    setVoted((localStorage.getItem(`docs-helpful-${pageId}`) as "yes" | "no") ?? null);
  }, [pageId]);

  const vote = (v: "yes" | "no") => {
    localStorage.setItem(`docs-helpful-${pageId}`, v);
    setVoted(v);
  };

  if (voted) {
    return (
      <p className="text-sm text-muted-foreground">
        {voted === "yes" ? "Glad it helped!" : "Thanks — we'll improve this page."}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-muted-foreground">Was this page helpful?</span>
      <button
        type="button"
        onClick={() => vote("yes")}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <ThumbsUp size={13} /> Yes
      </button>
      <button
        type="button"
        onClick={() => vote("no")}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <ThumbsDown size={13} /> No
      </button>
    </div>
  );
}

function Block({ block, nextBlock }: { block: ContentBlock; nextBlock?: ContentBlock }) {
  switch (block.type) {
    case "text":
      return <p className="text-base leading-relaxed text-foreground/80">{block.body}</p>;

    case "step": {
      const continues = nextBlock?.type === "step";
      return (
        <div id={`step-${block.number}`} className="flex gap-4 scroll-mt-8">
          <div className="flex shrink-0 flex-col items-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20">
              {block.number}
            </div>
            {continues && <div className="mt-2 min-h-8 w-px flex-1 bg-border" />}
          </div>
          <div className={`min-w-0 ${continues ? "pb-6" : ""}`}>
            <p className="mb-1 text-sm font-semibold text-foreground">{block.title}</p>
            <p className="text-base leading-relaxed text-muted-foreground">{block.body}</p>
          </div>
        </div>
      );
    }

    case "code":
      return (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
            <span className="font-mono text-[11px] text-zinc-500">{block.lang}</span>
            <CopyButton code={block.code} />
          </div>
          <pre className="overflow-x-auto whitespace-pre px-5 py-4 font-mono text-[13px] leading-relaxed text-zinc-200">
            {block.code}
          </pre>
        </div>
      );

    case "note":
      return (
        <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <Info size={15} className="mt-0.5 shrink-0 text-primary/60" />
          <p className="text-base leading-relaxed text-foreground/70">{block.body}</p>
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
  const [linkCopied, setLinkCopied] = useState(false);

  const copyLink = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}?topic=${page.id}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  }, [page.id]);

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => onNavigate("overview")}
          className="transition-colors hover:text-foreground"
        >
          Docs
        </button>
        <ChevronRight size={12} className="shrink-0" />
        <span>{groupLabel}</span>
        <ChevronRight size={12} className="shrink-0" />
        <span className="font-medium text-foreground">{page.title}</span>
      </nav>

      {/* Page header */}
      <div className="mb-8 border-b border-border pb-6">
        <div className="group flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{page.title}</h2>
          <button
            type="button"
            onClick={copyLink}
            aria-label="Copy link to this page"
            className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground"
          >
            {linkCopied
              ? <Check size={14} className="text-green-500" />
              : <LinkIcon size={14} />}
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{page.description}</p>
      </div>

      {/* Content blocks */}
      <div className="space-y-5">
        {page.blocks.map((block, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static ordered content
          <Block key={i} block={block} nextBlock={page.blocks[i + 1]} />
        ))}
      </div>

      {/* Was this helpful */}
      <div className="mt-12 border-b border-border pb-6">
        <HelpfulWidget pageId={page.id} />
      </div>

      {/* Prev / Next navigation */}
      <div className="mt-6 flex items-stretch justify-between gap-4">
        {prevPage ? (
          <button
            type="button"
            onClick={() => onNavigate(prevPage.id)}
            className="group flex max-w-[48%] flex-col gap-0.5 rounded-xl border border-border px-5 py-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/30"
          >
            <span className="text-[11px] text-muted-foreground">← Previous</span>
            <span className="text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
              {prevPage.title}
            </span>
            <span className="text-[11px] text-muted-foreground">{prevPage.group}</span>
          </button>
        ) : (
          <div />
        )}

        {nextPage && (
          <button
            type="button"
            onClick={() => onNavigate(nextPage.id)}
            className="group ml-auto flex max-w-[48%] flex-col gap-0.5 rounded-xl border border-border px-5 py-4 text-right transition-colors hover:border-primary/30 hover:bg-muted/30"
          >
            <span className="text-[11px] text-muted-foreground">Next →</span>
            <span className="text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
              {nextPage.title}
            </span>
            <span className="text-[11px] text-muted-foreground">{nextPage.group}</span>
          </button>
        )}
      </div>
    </div>
  );
}

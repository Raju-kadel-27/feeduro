import { Dialog, DialogContent } from "@components/ui/dialog";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronDown, LayoutDashboard, MessageSquarePlus, SendHorizonal, Tag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const TITLE_MAX = 120;
const TITLE_WARN = 90;

interface Props {
  boardId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface BoardOption { id: string; name: string }
interface CategoryOption { id: string; name: string; color: string }

export function CreateFeedbackDialog({ boardId: defaultBoardId, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBoardId, setSelectedBoardId] = useState(defaultBoardId);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: boardsData } = useQuery({
    queryKey: ["boards"],
    queryFn: async () => {
      const res = await fetch("/api/boards");
      return res.json() as Promise<{ boards: BoardOption[] }>;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return res.json() as Promise<{ categories: CategoryOption[] }>;
    },
  });

  const boards = boardsData?.boards ?? [];
  const categories = categoriesData?.categories ?? [];
  const selectedBoard = boards.find((b) => b.id === selectedBoardId);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const hasMultipleBoards = boards.length > 1;

  const { mutate, isPending, error } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "create",
          title,
          description,
          boardId: selectedBoardId,
          categoryId: selectedCategoryId || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to create");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback", selectedBoardId] });
      onSuccess?.();
      onClose();
    },
  });

  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDescription(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  // ⌘ Enter / Ctrl+Enter to submit
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isPending && title.trim()) {
        e.preventDefault();
        mutate();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isPending, title, mutate]);

  // Close menus on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setShowCategoryMenu(false);
      if (boardRef.current && !boardRef.current.contains(e.target as Node)) setShowBoardMenu(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    mutate();
  }

  const nearLimit = title.length >= TITLE_WARN;
  const atLimit = title.length >= TITLE_MAX;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[780px] p-0 rounded-3xl gap-0 [&>button]:hidden shadow-2xl">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-border/60 rounded-t-2xl overflow-hidden">
          <h2 className="flex items-center gap-2.5 text-[18px] font-semibold text-foreground">
              <MessageSquarePlus className="h-5 w-5 text-muted-foreground shrink-0" />
              New feedback
            </h2>
          <div className="flex items-center gap-2.5">
            <kbd className="hidden sm:flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-[12px] font-medium text-muted-foreground">
              <span>⌘</span><span>↵</span>
            </kbd>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Composer body ──────────────────────────────────── */}
        <form onSubmit={handleSubmit}>
          <div className="px-7 pt-7 pb-2">

            {/* Title */}
            <div className="relative mb-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your feedback?"
                autoFocus
                maxLength={TITLE_MAX}
                className="w-full bg-transparent pr-14 text-[20px] font-semibold text-foreground placeholder:text-muted-foreground/35 focus:outline-none leading-snug"
              />
              {nearLimit && (
                <span className={cn(
                  "absolute right-0 top-1 text-[13px] tabular-nums font-medium transition-colors",
                  atLimit ? "text-destructive" : "text-muted-foreground/60",
                )}>
                  {TITLE_MAX - title.length}
                </span>
              )}
            </div>

            {/* Description */}
            <textarea
              ref={textareaRef}
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Add details, steps to reproduce, or anything that gives context…"
              rows={4}
              className="w-full resize-none overflow-hidden bg-transparent text-[15px] text-foreground/80 placeholder:text-muted-foreground/35 focus:outline-none leading-relaxed"
              style={{ minHeight: "100px" }}
            />

          </div>

          {/* ── Footer ─────────────────────────────────────────── */}
          <div className="flex items-center gap-2 px-7 py-5">

            {/* Left: board + category pickers */}
            <div className="flex items-center gap-2">

              {/* Board selector */}
              <div ref={boardRef} className="relative">
                <button
                  type="button"
                  onClick={() => hasMultipleBoards && setShowBoardMenu((v) => !v)}
                  className={cn(
                    "flex items-center gap-2 h-9 w-[185px] pl-3 pr-2.5 rounded-full border text-[13px] font-medium transition-all overflow-hidden",
                    "border-border bg-muted/30 text-foreground",
                    hasMultipleBoards ? "hover:bg-muted hover:border-border/80 cursor-pointer" : "cursor-default",
                  )}
                >
                  <LayoutDashboard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1 min-w-0">{selectedBoard?.name ?? "Board"}</span>
                  {hasMultipleBoards && (
                    <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground opacity-60 shrink-0 transition-transform", showBoardMenu && "rotate-180")} />
                  )}
                </button>
                {showBoardMenu && (
                  <div className="absolute bottom-full left-0 mb-2 min-w-[200px] max-h-[240px] overflow-y-auto rounded-xl border border-border bg-popover shadow-lg z-50 py-1.5">
                    {boards.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => { setSelectedBoardId(b.id); setShowBoardMenu(false); }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-left transition-colors hover:bg-muted",
                          b.id === selectedBoardId ? "font-semibold text-foreground" : "text-foreground/80",
                        )}
                      >
                        <LayoutDashboard className="h-4 w-4 text-muted-foreground shrink-0" />
                        {b.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Category selector */}
              {categories.length > 0 && (
                <div ref={categoryRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCategoryMenu((v) => !v)}
                    className={cn(
                      "flex items-center gap-2 h-9 w-[185px] pl-3 pr-2.5 rounded-full border text-[13px] font-medium transition-all overflow-hidden",
                      selectedCategoryId
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-foreground hover:bg-muted hover:border-border/80",
                    )}
                  >
                    {selectedCategory ? (
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedCategory.color }} />
                    ) : (
                      <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate flex-1 min-w-0">{selectedCategory?.name ?? "Category"}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground opacity-60 shrink-0 transition-transform", showCategoryMenu && "rotate-180")} />
                  </button>
                  {showCategoryMenu && (
                    <div className="absolute bottom-full left-0 mb-2 min-w-[190px] max-h-[240px] overflow-y-auto rounded-xl border border-border bg-popover shadow-lg z-50 py-1.5">
                      <button
                        type="button"
                        onClick={() => { setSelectedCategoryId(""); setShowCategoryMenu(false); }}
                        className={cn(
                          "w-full px-4 py-2.5 text-[14px] text-left hover:bg-muted transition-colors",
                          !selectedCategoryId ? "font-semibold text-foreground" : "text-muted-foreground",
                        )}
                      >
                        No category
                      </button>
                      <div className="my-1 mx-3 h-px bg-border/60" />
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => { setSelectedCategoryId(cat.id); setShowCategoryMenu(false); }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-left hover:bg-muted transition-colors",
                            selectedCategoryId === cat.id ? "font-semibold text-foreground" : "text-foreground/80",
                          )}
                        >
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Right: error + action buttons */}
            <div className="ml-auto flex items-center gap-2.5">
              {error && (
                <div className="flex items-center gap-1.5 text-[13px] text-destructive min-w-0">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate max-w-[185px]">{(error as Error).message}</span>
                </div>
              )}
<button
                type="submit"
                disabled={isPending || !title.trim()}
                className={cn(
                  "h-10 px-5 rounded-xl bg-primary text-primary-foreground text-[14px] font-semibold transition-colors",
                  "hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed",
                )}
              >
                <SendHorizonal className="h-4 w-4 shrink-0" />
                {isPending ? "Posting…" : "Post feedback"}
              </button>
            </div>

          </div>
        </form>

      </DialogContent>
    </Dialog>
  );
}

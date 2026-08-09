import { TagIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Tag { id: string; name: string }

interface Props {
  changelogId: string;
  availableTags: Tag[];
  initialApplied: Tag[];
}

async function mutate(intent: string, changelogId: string, tagId: string) {
  const res = await fetch("/api/changelog-tag-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent, changelogId, tagId }),
  });
  if (!res.ok) throw new Error("Request failed");
}

export function ChangelogTagsPanel({ changelogId, availableTags, initialApplied }: Props) {
  const [applied, setApplied] = useState<Tag[]>(initialApplied);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const available = availableTags.filter((t) => !applied.some((a) => a.id === t.id));

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  async function add(tag: Tag) {
    setBusy(tag.id);
    try {
      await mutate("add-tag-item", changelogId, tag.id);
      setApplied((prev) => [...prev, tag]);
      setOpen(false);
    } catch {
      toast.error("Failed to add tag");
    } finally {
      setBusy(null);
    }
  }

  async function remove(tag: Tag) {
    setBusy(tag.id);
    try {
      await mutate("remove-tag-item", changelogId, tag.id);
      setApplied((prev) => prev.filter((t) => t.id !== tag.id));
    } catch {
      toast.error("Failed to remove tag");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2.5">
        <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Tags</span>
      </div>
      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
        {applied.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border/60 bg-background text-xs font-medium"
          >
            {tag.name}
            <button
              type="button"
              disabled={busy === tag.id}
              onClick={() => remove(tag)}
              className="hover:text-destructive transition-colors disabled:opacity-40"
              aria-label={`Remove ${tag.name}`}
            >
              <XIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
        {available.length > 0 && (
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-dashed text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              + Add tag
            </button>
            {open && (
              <div className="absolute left-0 top-full mt-1 z-10 w-44 rounded-lg border bg-popover shadow-lg overflow-hidden">
                {available.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    disabled={busy === tag.id}
                    onClick={() => add(tag)}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-40"
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {applied.length === 0 && available.length === 0 && (
          <span className="text-xs text-muted-foreground italic">No tags configured</span>
        )}
      </div>
    </div>
  );
}

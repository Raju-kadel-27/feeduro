import { Button } from "@components/ui/button";
import { PlusIcon, TagIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface Tag {
  id: string;
  name: string;
}

export function TagsSection({ initialTags }: { initialTags: Tag[] }) {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [newTag, setNewTag] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newTag.trim().toLowerCase();
    if (!name) return;
    if (tags.some((t) => t.name === name)) { toast.error("Tag already exists"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/changelog-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "create-tag", name }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(json.error);
      setTags((prev) => [...prev, { id: json.id!, name }]);
      setNewTag("");
      inputRef.current?.focus();
      toast.success("Tag created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tag");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch("/api/changelog-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "delete-tag", id }),
      });
      if (!res.ok) throw new Error();
      setTags((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tag deleted");
    } catch {
      toast.error("Failed to delete tag");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-2 border-b px-5 py-4">
        <h2 className="text-base font-semibold">Changelog Tags</h2>
      </div>
      <div className="divide-y">
        {tags.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-muted-foreground">No tags yet.</p>
        ) : (
          tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-2">
                <TagIcon className="h-3.5 w-3.5 shrink-0 text-teal-500" />
                <span className="text-base">{tag.name}</span>
              </div>
              <button
                type="button"
                disabled={deletingId === tag.id}
                onClick={() => handleDelete(tag.id)}
                className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                aria-label={`Delete ${tag.name}`}
              >
                <Trash2Icon className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
      <div className="border-t px-5 py-4">
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="New tag name…"
            maxLength={100}
            className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button size="sm" type="submit" disabled={creating || !newTag.trim()}>
            <PlusIcon className="h-3.5 w-3.5" />
            {creating ? "Creating…" : "Create Tag"}
          </Button>
        </form>
      </div>
    </div>
  );
}

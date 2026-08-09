import { UsersIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Author { id: string; name: string; email: string; image: string | null }

interface Props {
  changelogId: string;
  initialAuthors: Author[];
  orgMembers: Author[];
}

const AVATAR_COLORS = [
  "bg-violet-500 text-white",
  "bg-blue-500 text-white",
  "bg-emerald-500 text-white",
  "bg-orange-500 text-white",
  "bg-rose-500 text-white",
  "bg-cyan-500 text-white",
  "bg-amber-500 text-white",
  "bg-pink-500 text-white",
];

function avatarColor(id: string) {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function Avatar({ author }: { author: Author }) {
  return author.image ? (
    <img src={author.image} alt={author.name} className="h-6 w-6 rounded-full object-cover shrink-0" />
  ) : (
    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold uppercase shrink-0 ${avatarColor(author.id)}`}>
      {author.name.charAt(0)}
    </span>
  );
}

async function mutate(intent: string, changelogId: string, userId: string) {
  const res = await fetch("/api/changelog-authors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent, changelogId, userId }),
  });
  if (!res.ok) throw new Error("Request failed");
}

export function ChangelogAuthorsPanel({ changelogId, initialAuthors, orgMembers }: Props) {
  const [authors, setAuthors] = useState<Author[]>(initialAuthors);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const available = orgMembers.filter((m) => !authors.some((a) => a.id === m.id));

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  async function add(member: Author) {
    setBusy(member.id);
    try {
      await mutate("add-author", changelogId, member.id);
      setAuthors((prev) => [...prev, member]);
      setOpen(false);
    } catch {
      toast.error("Failed to add author");
    } finally {
      setBusy(null);
    }
  }

  async function remove(author: Author) {
    setBusy(author.id);
    try {
      await mutate("remove-author", changelogId, author.id);
      setAuthors((prev) => prev.filter((a) => a.id !== author.id));
    } catch {
      toast.error("Failed to remove author");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2.5">
        <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Authors</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {authors.length === 0 && (
          <span className="text-xs text-muted-foreground italic">No authors yet</span>
        )}
        {authors.map((author) => (
          <div key={author.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar author={author} />
              <span className="text-sm truncate">{author.name}</span>
            </div>
            <button
              type="button"
              disabled={busy === author.id}
              onClick={() => remove(author)}
              className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 shrink-0"
              aria-label={`Remove ${author.name}`}
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {available.length > 0 && (
          <div ref={dropdownRef} className="relative mt-0.5">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-dashed text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              + Add author
            </button>
            {open && (
              <div className="absolute left-0 top-full mt-1 z-10 w-52 rounded-lg border bg-popover shadow-lg max-h-48 overflow-y-auto">
                {available.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={busy === m.id}
                    onClick={() => add(m)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent transition-colors disabled:opacity-40"
                  >
                    <Avatar author={m} />
                    <div className="text-left min-w-0">
                      <p className="text-sm truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

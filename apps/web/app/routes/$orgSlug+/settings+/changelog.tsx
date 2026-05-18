import { Button } from "@components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { Switch } from "@components/ui/switch";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { parseChangelogSettings } from "@features/changelog/server/changelog-settings";
import { AppSidebar } from "@features/layout/components/app-sidebar";
import { eq } from "drizzle-orm";
import { PlusIcon, TagIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { getDb } from "@/db";
import { changelogTags, organization } from "@/db/schema";
import type { Route } from "./+types/changelog";

export function meta() {
  return [{ title: "Changelog Settings — Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  // Use the API loader to handle seeding + fetching
  const [org, tags] = await Promise.all([
    db.query.organization.findFirst({ where: eq(organization.id, organizationId) }),
    db.query.changelogTags.findMany({
      where: eq(changelogTags.organizationId, organizationId),
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    }),
  ]);

  return {
    ...parseChangelogSettings(org?.metadata ?? null),
    tags,
  };
}

interface Tag {
  id: string;
  name: string;
}

export default function ChangelogSettings({ loaderData }: Route.ComponentProps) {
  const [enabled, setEnabled] = useState(loaderData.enabled);
  const [tags, setTags] = useState<Tag[]>(loaderData.tags);
  const [newTag, setNewTag] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleToggle(value: boolean) {
    const prev = enabled;
    setEnabled(value);
    try {
      const res = await fetch("/api/changelog-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "toggle", enabled: value }),
      });
      if (!res.ok) throw new Error();
      toast.success(value ? "Changelog enabled" : "Changelog hidden");
    } catch {
      setEnabled(prev);
      toast.error("Failed to save");
    }
  }

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    const name = newTag.trim().toLowerCase();
    if (!name) return;
    if (tags.some((t) => t.name === name)) {
      toast.error("Tag already exists");
      return;
    }

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

  async function handleDeleteTag(id: string) {
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Changelog</span>
        </header>

        <main className="p-6 max-w-3xl mx-auto w-full space-y-8">
          <div>
            <h1 className="text-xl font-semibold">Changelog</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage changelog tags and visibility settings.
            </p>
          </div>

          {/* Enable changelog */}
          <div className="rounded-lg border p-5">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-medium">Enable Changelog</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  When disabled, your changelog will be hidden from your public board and users
                  won't be able to access it.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={handleToggle} />
            </div>
          </div>

          {/* Changelog tags */}
          <div className="rounded-lg border">
            <div className="flex items-center gap-2 border-b px-5 py-4">
              <TagIcon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">Changelog Tags</h2>
            </div>

            {/* Tag list */}
            <div className="divide-y">
              {tags.length === 0 ? (
                <p className="px-5 py-8 text-center text-xs text-muted-foreground">
                  No tags yet. Create one below.
                </p>
              ) : (
                tags.map((tag) => (
                  <div key={tag.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="text-sm">{tag.name}</span>
                    <button
                      type="button"
                      disabled={deletingId === tag.id}
                      onClick={() => handleDeleteTag(tag.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                      aria-label={`Delete ${tag.name}`}
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Create tag form */}
            <div className="border-t px-5 py-4">
              <form onSubmit={handleCreateTag} className="flex items-center gap-2">
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
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

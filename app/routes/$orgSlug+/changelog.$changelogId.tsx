import { AppSidebar } from "@components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { requireOrgBySlug } from "@lib/session.server";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { ArrowLeft, Check, Clock, Globe, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { getDb } from "@/db";
import { changelogs } from "@/db/schema";
import type { Route } from "./+types/changelog.$changelogId";

export function meta({ params }: Route.MetaArgs) {
  return [
    {
      title: params.changelogId === "new" ? "New Changelog – Feediyo" : "Edit Changelog – Feediyo",
    },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, org } = await requireOrgBySlug(request, params.orgSlug);

  if (params.changelogId === "new") {
    return { user: session.user, changelog: null };
  }

  const db = getDb();
  const entry = await db.query.changelogs.findFirst({
    where: and(eq(changelogs.id, params.changelogId), eq(changelogs.organizationId, org.id)),
  });

  return { user: session.user, changelog: entry ?? null };
}

type ChangelogEntry = {
  id: string;
  title: string;
  slug: string;
  body: string;
  status: "draft" | "published";
  publishedAt: Date | null;
};

type EditorComponent = React.ComponentType<{
  initialContent: string;
  onChange: (content: string) => void;
}>;

export default function ChangelogEditor({ loaderData }: Route.ComponentProps) {
  const { orgSlug, changelogId } = useParams<{
    orgSlug: string;
    changelogId: string;
  }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = changelogId === "new";

  const [title, setTitle] = useState(loaderData.changelog?.title ?? "");
  const [body, setBody] = useState(loaderData.changelog?.body ?? "[]");
  const [status, setStatus] = useState<"draft" | "published">(
    (loaderData.changelog?.status as "draft" | "published") ?? "draft",
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [EditorComponent, setEditorComponent] = useState<EditorComponent | null>(null);
  const bodyRef = useRef(body);
  const isFirstRenderRef = useRef(true);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bodyRef.current = body;
  }, [body]);

  // Dynamically import the editor only on the client to avoid SSR issues
  useEffect(() => {
    import("@components/changelog/changelog-editor").then((m) => {
      setEditorComponent(() => m.default as EditorComponent);
    });
  }, []);

  const handleBodyChange = useCallback((content: string) => {
    setBody(content);
    bodyRef.current = content;
  }, []);

  const { mutate: saveContent, isPending: saving } = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required");

      if (isNew) {
        const res = await fetch("/api/changelogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "create", title, body: bodyRef.current }),
        });
        const json = (await res.json()) as { success?: boolean; id?: string; error?: string };
        if (!json.success) throw new Error(json.error ?? "Failed to create");
        return json;
      }

      const res = await fetch("/api/changelogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "update", id: changelogId, title, body: bodyRef.current }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? "Failed to save");
      return json;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["changelogs"] });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2500);
      if (isNew && result && "id" in result && result.id) {
        navigate(`/${orgSlug}/changelog/${result.id}`, { replace: true });
      }
    },
    onError: (err) => {
      setSaveStatus("idle");
      toast.error(err instanceof Error ? err.message : "Autosave failed");
    },
  });

  // Autosave: debounce 1.5 s after any title or body change, skip on first render
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (!title.trim()) return;

    setSaveStatus("saving");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      saveContent();
    }, 1500);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body]);

  const { mutate: publish, isPending: publishing } = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required");

      // Cancel any pending autosave so we don't race
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

      // Save current content first
      if (!isNew) {
        await fetch("/api/changelogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "update", id: changelogId, title, body: bodyRef.current }),
        });
      }

      const idToPublish = isNew ? undefined : changelogId;

      if (isNew) {
        const res = await fetch("/api/changelogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "create", title, body: bodyRef.current }),
        });
        const json = (await res.json()) as { success?: boolean; id?: string; error?: string };
        if (!json.success) throw new Error(json.error ?? "Failed to create");

        // Now publish
        const pubRes = await fetch("/api/changelogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "publish", id: json.id }),
        });
        const pubJson = (await pubRes.json()) as { success?: boolean; error?: string };
        if (!pubJson.success) throw new Error(pubJson.error ?? "Failed to publish");
        return { id: json.id };
      }

      const res = await fetch("/api/changelogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "publish", id: idToPublish }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? "Failed to publish");
      return json;
    },
    onSuccess: (result) => {
      setStatus("published");
      qc.invalidateQueries({ queryKey: ["changelogs"] });
      toast.success("Published");
      if (isNew && result && "id" in result) {
        navigate(`/${orgSlug}/changelog/${result.id}`, { replace: true });
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    },
  });

  const { mutate: unpublish, isPending: unpublishing } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/changelogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "unpublish", id: changelogId }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? "Failed to unpublish");
      return json;
    },
    onSuccess: () => {
      setStatus("draft");
      qc.invalidateQueries({ queryKey: ["changelogs"] });
      toast.success("Moved to draft");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to unpublish");
    },
  });

  const isBusy = saving || publishing || unpublishing;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <button
            type="button"
            onClick={() => navigate(`/${orgSlug}/changelog`)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Changelog
          </button>
          <div className="flex-1" />

          <div className="flex items-center gap-3">
            {/* Autosave status */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-16">
              {saving && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving…</span>
                </>
              )}
              {!saving && saveStatus === "saved" && (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  <span>Saved</span>
                </>
              )}
            </div>

            {!isNew && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                  status === "published"
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {status === "published" ? (
                  <Globe className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {status === "published" ? "Published" : "Draft"}
              </span>
            )}

            {status === "published" ? (
              <button
                type="button"
                onClick={() => unpublish()}
                disabled={isBusy}
                className="px-3 py-1.5 rounded-md border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                {unpublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Unpublish"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => publish()}
                disabled={isBusy}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Publish"}
              </button>
            )}
          </div>
        </header>

        <main className="flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full px-6 py-8 flex flex-col gap-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Changelog title…"
              className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 resize-none"
            />

            {EditorComponent ? (
              <EditorComponent initialContent={body} onChange={handleBodyChange} />
            ) : (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading editor…
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

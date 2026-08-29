import { Skeleton } from "@components/ui/skeleton";
import { Spinner } from "@components/ui/spinner";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { ChangelogMetadataSidebar } from "@features/changelog/components/internal/changelog-metadata-sidebar";
import { PublishConfirmPopover } from "@features/changelog/components/internal/publish-confirm-popover";
import {
  getChangelogAppliedTags,
  getChangelogAuthorsForEditor,
  getChangelogLinkedRequests,
  getOrgMembers,
} from "@features/changelog/server/changelog-metadata";
import { parseChangelogSettings } from "@features/changelog/server/changelog-settings";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Check, ChevronLeft, Clock, Globe } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { changelogs, changelogTags, organization } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/$changelogId";

const ChangelogEditorWidget = lazy(() =>
  import("@features/changelog/components/internal/changelog-editor.client").then((m) => ({
    default: m.ChangelogEditor,
  })),
);

export function meta({ params }: Route.MetaArgs) {
  return [
    {
      title: params.changelogId === "new" ? "New Changelog – Feeduro" : "Edit Changelog – Feeduro",
    },
  ];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, org } = await requireOrgBySlug(db, request, params.orgSlug);
  const isNew = params.changelogId === "new";

  const [orgRow, entry, appliedTags, authors, linkedRequests, availableTags, orgMembers] =
    await Promise.all([
      db.query.organization.findFirst({
        where: eq(organization.id, org.id),
        columns: { metadata: true },
      }),
      isNew
        ? Promise.resolve(null)
        : db.query.changelogs.findFirst({
            where: and(eq(changelogs.id, params.changelogId), eq(changelogs.organizationId, org.id)),
          }),
      isNew ? Promise.resolve([]) : getChangelogAppliedTags(db, params.changelogId),
      isNew ? Promise.resolve([]) : getChangelogAuthorsForEditor(db, org.id, params.changelogId),
      isNew ? Promise.resolve([]) : getChangelogLinkedRequests(db, org.id, params.changelogId),
      db.query.changelogTags.findMany({
        where: eq(changelogTags.organizationId, org.id),
        columns: { id: true, name: true },
      }),
      getOrgMembers(db, org.id),
    ]);

  const { emailSubscriptionsEnabled } = parseChangelogSettings(orgRow?.metadata ?? null);

  return {
    user: session.user,
    changelog: entry ?? null,
    emailSubscriptionsEnabled,
    appliedTags,
    availableTags,
    authors,
    orgMembers,
    linkedRequests,
  };
}

export default function ChangelogEditor({ loaderData }: Route.ComponentProps) {
  const { orgSlug, changelogId } = useParams<{ orgSlug: string; changelogId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = changelogId === "new";

  const [title, setTitle] = useState(loaderData.changelog?.title ?? "");
  const [body, setBody] = useState(loaderData.changelog?.body ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    (loaderData.changelog?.status as "draft" | "published") ?? "draft",
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const bodyRef = useRef(body);
  const isFirstRenderRef = useRef(true);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { bodyRef.current = body; }, [body]);

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
      if (isNew && result && "id" in result && result.id) {
        navigate(`/${orgSlug}/changelog/${result.id}`, { replace: true });
      }
    },
    onError: (err) => {
      setSaveStatus("idle");
      toast.error(err instanceof Error ? err.message : "Autosave failed");
    },
  });

  useEffect(() => {
    if (isFirstRenderRef.current) { isFirstRenderRef.current = false; return; }
    if (!title.trim()) return;
    setSaveStatus("saving");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => saveContent(), 1500);
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, saveContent]);

  const { mutate: publish, isPending: publishing } = useMutation({
    mutationFn: async (notifySubscribers: boolean) => {
      if (!title.trim()) throw new Error("Title is required");
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (!isNew) {
        await fetch("/api/changelogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "update", id: changelogId, title, body: bodyRef.current }),
        });
      }
      if (isNew) {
        const res = await fetch("/api/changelogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "create", title, body: bodyRef.current }),
        });
        const json = (await res.json()) as { success?: boolean; id?: string; error?: string };
        if (!json.success) throw new Error(json.error ?? "Failed to create");
        const pubRes = await fetch("/api/changelogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "publish", id: json.id, notifySubscribers }),
        });
        const pubJson = (await pubRes.json()) as { success?: boolean; error?: string };
        if (!pubJson.success) throw new Error(pubJson.error ?? "Failed to publish");
        return { id: json.id };
      }
      const res = await fetch("/api/changelogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "publish", id: changelogId, notifySubscribers }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? "Failed to publish");
      return json;
    },
    onSuccess: (result) => {
      setStatus("published");
      qc.invalidateQueries({ queryKey: ["changelogs"] });
      toast.success("Published");
      if (isNew && result && "id" in result) navigate(`/${orgSlug}/changelog/${result.id}`, { replace: true });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to publish"),
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
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to unpublish"),
  });

  const isBusy = saving || publishing || unpublishing;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 px-4">
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-16">
            {saving || saveStatus === "saving" ? (
              <><Spinner className="size-3" /><span>Saving…</span></>
            ) : (
              <><Check className="h-3 w-3 text-green-500" /><span>Saved</span></>
            )}
          </div>
          {!isNew && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status === "published" ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"}`}>
              {status === "published" ? <Globe className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {status === "published" ? "Published" : "Draft"}
            </span>
          )}
          {status === "published" ? (
            <button type="button" onClick={() => unpublish()} disabled={isBusy} className="px-3 py-1.5 rounded-md border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
              {unpublishing ? <Spinner className="size-3.5" /> : "Unpublish"}
            </button>
          ) : (
            <PublishConfirmPopover disabled={isBusy} publishing={publishing} subscriptionsEnabled={loaderData.emailSubscriptionsEnabled} onPublish={(notify) => publish(notify)} />
          )}
        </div>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        <main className="relative flex-1 overflow-y-auto">
          <button type="button" onClick={() => navigate(`/${orgSlug}/changelog`)} aria-label="Back to changelog" className="absolute top-[1.4370rem] left-14 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="max-w-3xl mx-auto w-full px-6 pt-4 pb-8 flex flex-col gap-4">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Changelog title…" className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 resize-none" />
            <Suspense fallback={<Skeleton className="w-full h-[400px] rounded-md" />}>
              <ChangelogEditorWidget initialBody={body} onChange={(c) => { setBody(c); bodyRef.current = c; }} />
            </Suspense>
          </div>
        </main>

        {!isNew && changelogId && (
          <ChangelogMetadataSidebar
            changelogId={changelogId}
            appliedTags={loaderData.appliedTags}
            availableTags={loaderData.availableTags}
            authors={loaderData.authors}
            orgMembers={loaderData.orgMembers}
            linkedRequests={loaderData.linkedRequests}
          />
        )}
      </div>
    </>
  );
}

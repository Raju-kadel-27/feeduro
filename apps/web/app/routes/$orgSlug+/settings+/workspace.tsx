import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { AppSidebar } from "@features/layout/components/app-sidebar/app-sidebar";
import { isAdmin } from "@features/roles/server/queries";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import type { Route } from "./+types/workspace";

export function meta() {
  return [{ title: "Workspace Settings — Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { org, session, organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const admin = await isAdmin(organizationId, session.user.id);
  return { orgName: org.name, orgSlug: org.slug, organizationId, isAdmin: admin };
}

export default function WorkspaceSettings({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const { orgName, orgSlug, organizationId, isAdmin: admin } = loaderData;

  const [name, setName] = useState(orgName);
  const [slug, setSlug] = useState(orgSlug);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    mutate: saveName,
    isPending: savingName,
    error: nameError,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "update_name", name }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to update name");
    },
  });

  const {
    mutate: saveSlug,
    isPending: savingSlug,
    error: slugError,
  } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "update_slug", slug }),
      });
      const json = (await res.json()) as { error?: string; newSlug?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to update slug");
      return json.newSlug;
    },
    onSuccess: (newSlug) => {
      if (newSlug) navigate(`/${newSlug}/settings/workspace`, { replace: true });
    },
  });

  const { mutate: deleteOrg, isPending: deleting } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "delete_org", organizationId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to delete workspace");
    },
    onSuccess: () => navigate("/", { replace: true }),
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Workspace</span>
        </header>

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
          <div>
            <h1 className="text-xl font-semibold">Workspace</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your workspace name, slug, and other general settings.
            </p>
          </div>

          {/* Workspace name */}
          <section className="rounded-lg border p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Workspace name</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                The display name of your workspace shown across the app.
              </p>
            </div>
            <div className="flex gap-2 items-start">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!admin}
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              {admin && (
                <button
                  type="button"
                  onClick={() => saveName()}
                  disabled={savingName || name.trim() === orgName}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {savingName ? "Saving…" : "Save"}
                </button>
              )}
            </div>
            {nameError && <p className="text-xs text-destructive">{nameError.message}</p>}
          </section>

          {/* Workspace slug */}
          <section className="rounded-lg border p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Workspace URL</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                The unique slug used in your workspace URL. Changing it will break any existing
                links.
              </p>
            </div>
            <div className="flex gap-2 items-start">
              <div className="flex flex-1 items-center rounded-md border border-input overflow-hidden">
                <span className="px-3 py-1.5 text-sm text-muted-foreground bg-muted border-r border-input select-none">
                  app.feediyo.com/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  disabled={!admin}
                  className="flex-1 px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
              </div>
              {admin && (
                <button
                  type="button"
                  onClick={() => saveSlug()}
                  disabled={savingSlug || slug.trim() === orgSlug}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {savingSlug ? "Saving…" : "Save"}
                </button>
              )}
            </div>
            {slugError && <p className="text-xs text-destructive">{slugError.message}</p>}
          </section>

          {/* Danger zone */}
          {admin && (
            <section className="rounded-lg border border-destructive/40 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Delete this workspace</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Permanently delete this workspace and all its data. This cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="px-3 py-1.5 rounded-md border border-destructive text-destructive text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  Delete workspace
                </button>
              </div>
            </section>
          )}
        </main>
      </SidebarInset>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workspace</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">{orgName}</span> and all its data.
              Type the workspace name to confirm.
            </DialogDescription>
          </DialogHeader>
          <input
            type="text"
            placeholder={orgName}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="px-3 py-1.5 rounded-md border text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => deleteOrg()}
              disabled={deleting || deleteConfirm !== orgName}
              className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors"
            >
              {deleting ? "Deleting…" : "Delete workspace"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

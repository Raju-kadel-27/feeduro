import { Spinner } from "@components/ui/spinner";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { IntegrationPageHeader } from "@features/internal/integrations/components/integration-page-header";
import type { NotionSettings } from "@features/internal/integrations/notion/server/schemas";
import { getIntegration, parseSettings } from "@features/internal/integrations/server/queries";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { ChevronDown, ExternalLink, Unplug } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/notion";

export function meta() {
  return [{ title: "Notion Integration — Feeduro" }];
}

export function shouldRevalidate() {
  return false;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const [memberRecord, integration] = await Promise.all([
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
    getIntegration(db, organizationId, "notion"),
  ]);

  const settings = parseSettings<NotionSettings>(integration?.settings ?? null);

  return {
    isAdmin: memberRecord?.role === "admin",
    connected: !!integration?.accessToken,
    workspaceName: settings?.workspaceName ?? null,
    defaultDatabaseId: settings?.defaultDatabaseId ?? null,
    defaultDatabaseName: settings?.defaultDatabaseName ?? null,
    autoCreatePages: settings?.autoCreatePages ?? false,
  };
}

function NotionIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect width="100" height="100" rx="18" fill="#000" />
      <path
        d="M22 22 L22 78 L36 78 L36 44 L64 78 L78 78 L78 22 L64 22 L64 56 L36 22 Z"
        fill="white"
      />
    </svg>
  );
}

export default function NotionIntegrationSettings({ loaderData }: Route.ComponentProps) {
  const {
    isAdmin,
    connected,
    workspaceName,
    defaultDatabaseId: initialDbId,
    defaultDatabaseName: initialDbName,
    autoCreatePages: initialAutoCreate,
  } = loaderData;

  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();

  const [selectedDbId, setSelectedDbId] = useState(initialDbId ?? "");
  const [selectedDbName, setSelectedDbName] = useState(initialDbName ?? "");
  const [autoCreate, setAutoCreate] = useState(initialAutoCreate);
  const [disconnecting, setDisconnecting] = useState(false);

  const { data: dbData, isLoading: loadingDbs } = useQuery({
    queryKey: ["notion-databases"],
    queryFn: async () => {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "list_databases" }),
      });
      return res.json() as Promise<{ databases?: { id: string; name: string }[]; error?: string }>;
    },
    enabled: connected && isAdmin,
    staleTime: 60_000,
  });

  const { mutate: saveSettings, isPending: saving } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "update_settings",
          defaultDatabaseId: selectedDbId || undefined,
          defaultDatabaseName: selectedDbName || undefined,
          autoCreatePages: autoCreate,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.error) throw new Error(json.error);
    },
    onSuccess: () => {
      toast.success("Notion settings saved");
      qc.invalidateQueries({ queryKey: ["notion-databases"] });
    },
    onError: (err) => toast.error(err.message),
  });

  async function handleDisconnect() {
    if (!confirm("Disconnect Notion? Linked page data will remain but new events won't sync."))
      return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "disconnect" }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.error) throw new Error(json.error);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
      setDisconnecting(false);
    }
  }

  return (
        <>
        <IntegrationPageHeader title="Notion" />

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
              <NotionIcon size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Notion Integration</h2>
              <p className="text-sm text-muted-foreground">
                Create and link Notion pages from feedback posts.
              </p>
            </div>
          </div>

          {/* Step 1 — Connect */}
          <section className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    connected
                      ? "bg-green-500 text-white"
                      : "bg-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  1
                </span>
                <span className="text-sm font-medium">Connect Notion</span>
              </div>
              {connected && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                    Connected{workspaceName ? ` · ${workspaceName}` : ""}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    >
                      <Unplug className="h-3 w-3" />
                      {disconnecting ? "Disconnecting…" : "Disconnect"}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              {connected ? (
                <a
                  href="/api/notion?intent=connect"
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  Reconnect
                </a>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Authorize Feeduro to access your Notion workspace. You'll be redirected to
                    Notion's authorization page.
                  </p>
                  <a
                    href="/api/notion?intent=connect"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <NotionIcon size={14} />
                    Connect Notion
                  </a>
                  <p className="text-sm text-muted-foreground">
                    Required: Create an integration at{" "}
                    <a
                      href="https://www.notion.so/my-integrations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      notion.so/my-integrations
                      <ExternalLink className="inline h-2.5 w-2.5 ml-0.5" />
                    </a>{" "}
                    then set{" "}
                    <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                      NOTION_CLIENT_ID
                    </code>{" "}
                    and{" "}
                    <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                      NOTION_CLIENT_SECRET
                    </code>
                    .
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Step 2 — Configure */}
          {connected && (
            <section className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  2
                </span>
                <span className="text-sm font-medium">Configure</span>
              </div>

              <div className="p-4 space-y-5">
                {/* Default database */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Default database</label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Pages created from feedback will go into this database.
                  </p>
                  {loadingDbs ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner className="size-3.5" />
                      Loading databases…
                    </div>
                  ) : dbData?.error ? (
                    <p className="text-sm text-destructive">{dbData.error}</p>
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedDbId}
                        onChange={(e) => {
                          const opt = e.target.options[e.target.selectedIndex];
                          setSelectedDbId(e.target.value);
                          setSelectedDbName(opt.text);
                        }}
                        className="w-full appearance-none px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary pr-8"
                      >
                        <option value="">— No default —</option>
                        {(dbData?.databases ?? []).map((db) => (
                          <option key={db.id} value={db.id}>
                            {db.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Only databases shared with your Feeduro integration appear here.
                  </p>
                </div>

                {/* Auto-create */}
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoCreate}
                    onClick={() => setAutoCreate((v) => !v)}
                    className={cn(
                      "relative shrink-0 h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                      autoCreate ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                        autoCreate ? "translate-x-4" : "translate-x-0.5",
                      )}
                    />
                  </button>
                  <div>
                    <p className="text-sm font-medium">Auto-create pages</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically create a Notion page when a new feedback post is submitted.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => saveSettings()}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? (
                    <>
                      <Spinner className="size-3.5" />
                      Saving…
                    </>
                  ) : (
                    "Save settings"
                  )}
                </button>
              </div>
            </section>
          )}
        </main>
        </>
  );
}

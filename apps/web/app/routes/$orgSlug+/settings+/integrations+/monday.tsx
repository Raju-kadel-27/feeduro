import { Spinner } from "@components/ui/spinner";
import { IntegrationPageHeader } from "@features/internal/integrations/components/integration-page-header";
import { requireOrgBySlug } from "@features/auth/server/guards";
import type { MondaySettings } from "@features/internal/integrations/monday/server/schemas";
import { getIntegration, parseSettings } from "@features/internal/integrations/server/queries";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { ChevronDown, ExternalLink, Unplug } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { getDb } from "@/db";
import { member } from "@/db/schema";
import type { Route } from "./+types/monday";

export function meta() {
  return [{ title: "Monday.com Integration — Feeduro" }];
}

const FEEDURO_STATUSES = [
  { value: "open", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
] as const;

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const [memberRecord, integration] = await Promise.all([
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
    getIntegration(organizationId, "monday"),
  ]);

  const isAdmin = memberRecord?.role === "admin";
  const settings = parseSettings<MondaySettings>(integration?.settings ?? null);

  return {
    isAdmin,
    connected: !!integration?.accessToken,
    accountName: settings?.accountName ?? null,
    defaultBoardId: settings?.defaultBoardId ?? null,
    defaultBoardName: settings?.defaultBoardName ?? null,
    defaultGroupId: settings?.defaultGroupId ?? null,
    autoCreateItems: settings?.autoCreateItems ?? false,
    statusMappings: settings?.statusMappings ?? [],
    webhooksActive: !!settings?.webhookIds?.length,
  };
}

function MondayIcon({ size = 20 }: { size?: number }) {
  const r = Math.round(size * 0.175);
  const y = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={size * 0.2} cy={y} r={r} fill="#FF3D57" />
      <circle cx={size * 0.5} cy={y} r={r} fill="#FFCB00" />
      <circle cx={size * 0.8} cy={y} r={r} fill="#00CA72" />
    </svg>
  );
}

export default function MondayIntegrationSettings({ loaderData }: Route.ComponentProps) {
  const {
    isAdmin,
    connected,
    accountName,
    defaultBoardId: initialBoardId,
    defaultBoardName: initialBoardName,
    defaultGroupId: initialGroupId,
    autoCreateItems: initialAutoCreate,
    statusMappings: initialMappings,
    webhooksActive,
  } = loaderData;

  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();

  const [selectedBoardId, setSelectedBoardId] = useState(initialBoardId ?? "");
  const [selectedBoardName, setSelectedBoardName] = useState(initialBoardName ?? "");
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId ?? "");
  const [autoCreate, setAutoCreate] = useState(initialAutoCreate);
  const [statusMappings, setStatusMappings] = useState<Record<string, string>>(() =>
    Object.fromEntries((initialMappings ?? []).map((m) => [m.groupId, m.feeduroStatus])),
  );
  const [disconnecting, setDisconnecting] = useState(false);

  // ── Fetch boards ────────────────────────────────────────────────────────────
  const { data: boardsData, isLoading: loadingBoards } = useQuery({
    queryKey: ["monday-boards"],
    queryFn: async () => {
      const res = await fetch("/api/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "list_boards" }),
      });
      return res.json() as Promise<{ boards?: { id: string; name: string }[]; error?: string }>;
    },
    enabled: connected && isAdmin,
    staleTime: 60_000,
  });

  // ── Fetch groups when a board is selected ───────────────────────────────────
  const { data: groupsData, isLoading: loadingGroups } = useQuery({
    queryKey: ["monday-groups", selectedBoardId],
    queryFn: async () => {
      const res = await fetch("/api/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "list_groups", boardId: selectedBoardId }),
      });
      return res.json() as Promise<{ groups?: { id: string; title: string }[]; error?: string }>;
    },
    enabled: connected && isAdmin && !!selectedBoardId,
    staleTime: 120_000,
  });

  const mondayGroups = groupsData?.groups ?? [];

  // ── Save settings ───────────────────────────────────────────────────────────
  const { mutate: saveSettings, isPending: saving } = useMutation({
    mutationFn: async () => {
      const mappings = mondayGroups
        .filter((g) => statusMappings[g.id])
        .map((g) => ({
          groupId: g.id,
          groupTitle: g.title,
          feeduroStatus: statusMappings[g.id],
        }));

      const res = await fetch("/api/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "update_settings",
          defaultBoardId: selectedBoardId || undefined,
          defaultBoardName: selectedBoardName || undefined,
          defaultGroupId: selectedGroupId || undefined,
          autoCreateItems: autoCreate,
          statusMappings: mappings,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.error) throw new Error(json.error);
    },
    onSuccess: () => {
      toast.success("Monday.com settings saved");
      qc.invalidateQueries({ queryKey: ["monday-boards"] });
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Disconnect ──────────────────────────────────────────────────────────────
  async function handleDisconnect() {
    if (
      !confirm("Disconnect Monday.com? All linked item data will remain but new events won't sync.")
    )
      return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/monday", {
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
        <IntegrationPageHeader title="Monday.com" />

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
              <MondayIcon size={24} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Monday.com Integration</h2>
              <p className="text-sm text-muted-foreground">
                Create and link Monday.com items from feedback posts with bi-directional status
                sync.
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
                <span className="text-sm font-medium">Connect Monday.com</span>
              </div>
              {connected && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                    Connected{accountName ? ` · ${accountName}` : ""}
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
                <div className="space-y-3">
                  {webhooksActive ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                      Webhooks active — status sync is enabled
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-muted text-muted-foreground">
                      Webhooks not active (select a board and save to enable sync)
                    </div>
                  )}

                  <a
                    href="/api/monday?intent=connect"
                    className="text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    Reconnect
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Authorize Feeduro to access your Monday.com account. You'll be redirected to
                    Monday.com's login page.
                  </p>
                  <a
                    href="/api/monday?intent=connect"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: "#FF3D57" }}
                  >
                    <MondayIcon size={14} />
                    Connect Monday.com
                  </a>
                  <p className="text-sm text-muted-foreground">
                    Required: Create an OAuth app at{" "}
                    <a
                      href="https://monday.com/developers/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      monday.com/developers/apps
                      <ExternalLink className="inline h-2.5 w-2.5 ml-0.5" />
                    </a>{" "}
                    then set{" "}
                    <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                      MONDAY_CLIENT_ID
                    </code>{" "}
                    and{" "}
                    <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                      MONDAY_CLIENT_SECRET
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
                {/* Default board */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Default board</label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Items created from feedback will go to this board by default.
                  </p>
                  {loadingBoards ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner className="size-3.5" />
                      Loading boards…
                    </div>
                  ) : boardsData?.error ? (
                    <p className="text-sm text-destructive">{boardsData.error}</p>
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedBoardId}
                        onChange={(e) => {
                          const opt = e.target.options[e.target.selectedIndex];
                          setSelectedBoardId(e.target.value);
                          setSelectedBoardName(opt.text);
                          setSelectedGroupId("");
                        }}
                        className="w-full appearance-none px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary pr-8"
                      >
                        <option value="">— No default —</option>
                        {(boardsData?.boards ?? []).map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Default group */}
                {selectedBoardId && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Default group</label>
                    <p className="text-sm text-muted-foreground mb-2">
                      New items will be added to this group. Leave empty to use the board default.
                    </p>
                    {loadingGroups ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Spinner className="size-3.5" />
                        Loading groups…
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={selectedGroupId}
                          onChange={(e) => setSelectedGroupId(e.target.value)}
                          className="w-full appearance-none px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary pr-8"
                        >
                          <option value="">— Board default —</option>
                          {mondayGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.title}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                )}

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
                    <p className="text-sm font-medium">Auto-create items</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically create a Monday.com item when a new feedback post is submitted.
                    </p>
                  </div>
                </div>

                {/* Group → status mapping */}
                {selectedBoardId && mondayGroups.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-0.5">Status mapping</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      When a Monday.com item moves to a group, automatically update the Feeduro post
                      status.
                    </p>

                    {loadingGroups ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Spinner className="size-3.5" />
                        Loading groups…
                      </div>
                    ) : (
                      <div className="rounded-md border divide-y">
                        {mondayGroups.map((g) => (
                          <div
                            key={g.id}
                            className="flex items-center justify-between px-3 py-2.5 gap-3"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="h-2 w-2 rounded-full shrink-0 bg-slate-400" />
                              <span className="text-sm truncate">{g.title}</span>
                            </div>
                            <span className="text-sm text-muted-foreground shrink-0">→</span>
                            <div className="relative shrink-0">
                              <select
                                value={statusMappings[g.id] ?? ""}
                                onChange={(e) =>
                                  setStatusMappings((prev) => {
                                    const next = { ...prev };
                                    if (e.target.value) next[g.id] = e.target.value;
                                    else delete next[g.id];
                                    return next;
                                  })
                                }
                                className="appearance-none text-sm border rounded-md px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary pr-6"
                              >
                                <option value="">No mapping</option>
                                {FEEDURO_STATUSES.map((fs) => (
                                  <option key={fs.value} value={fs.value}>
                                    {fs.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => saveSettings()}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
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

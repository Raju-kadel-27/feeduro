import { Spinner } from "@components/ui/spinner";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { IntegrationPageHeader } from "@features/internal/integrations/components/integration-page-header";
import { getIntegration, parseSettings } from "@features/internal/integrations/server/queries";
import type { TrelloSettings } from "@features/internal/integrations/trello/server/schemas";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { ChevronDown, ExternalLink, Unplug } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/trello";

export function meta() {
  return [{ title: "Trello Integration — Feeduro" }];
}

const FEEDURO_STATUSES = [
  { value: "open", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
] as const;

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
    getIntegration(db, organizationId, "trello"),
  ]);

  const isAdmin = memberRecord?.role === "admin";
  const settings = parseSettings<TrelloSettings>(integration?.settings ?? null);

  return {
    isAdmin,
    connected: !!integration?.accessToken,
    memberUsername: settings?.memberUsername ?? null,
    defaultBoardId: settings?.defaultBoardId ?? null,
    defaultBoardName: settings?.defaultBoardName ?? null,
    defaultListId: settings?.defaultListId ?? null,
    defaultListName: settings?.defaultListName ?? null,
    autoCreateCards: settings?.autoCreateCards ?? false,
    statusMappings: settings?.statusMappings ?? [],
    webhookActive: !!settings?.webhookId,
  };
}

function TrelloIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="3" fill="#0052CC" />
      <rect x="3" y="3" width="5.5" height="12" rx="1.5" fill="white" />
      <rect x="11.5" y="3" width="5.5" height="8" rx="1.5" fill="white" />
    </svg>
  );
}

export default function TrelloIntegrationSettings({ loaderData }: Route.ComponentProps) {
  const {
    isAdmin,
    connected,
    memberUsername,
    defaultBoardId: initialBoardId,
    defaultBoardName: initialBoardName,
    defaultListId: initialListId,
    defaultListName: initialListName,
    autoCreateCards: initialAutoCreate,
    statusMappings: initialMappings,
    webhookActive,
  } = loaderData;

  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();

  const [selectedBoardId, setSelectedBoardId] = useState(initialBoardId ?? "");
  const [selectedBoardName, setSelectedBoardName] = useState(initialBoardName ?? "");
  const [selectedListId, setSelectedListId] = useState(initialListId ?? "");
  const [selectedListName, setSelectedListName] = useState(initialListName ?? "");
  const [autoCreate, setAutoCreate] = useState(initialAutoCreate);
  const [statusMappings, setStatusMappings] = useState<Record<string, string>>(() =>
    Object.fromEntries((initialMappings ?? []).map((m) => [m.listId, m.feeduroStatus])),
  );
  const [disconnecting, setDisconnecting] = useState(false);

  // ── Fetch boards ────────────────────────────────────────────────────────────
  const { data: boardsData, isLoading: loadingBoards } = useQuery({
    queryKey: ["trello-boards"],
    queryFn: async () => {
      const res = await fetch("/api/oauth2/integrations/trello", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "list_boards" }),
      });
      return res.json() as Promise<{ boards?: { id: string; name: string }[]; error?: string }>;
    },
    enabled: connected && isAdmin,
    staleTime: 60_000,
  });

  // ── Fetch lists when a board is selected ────────────────────────────────────
  const { data: listsData, isLoading: loadingLists } = useQuery({
    queryKey: ["trello-lists", selectedBoardId],
    queryFn: async () => {
      const res = await fetch("/api/oauth2/integrations/trello", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "list_lists", boardId: selectedBoardId }),
      });
      return res.json() as Promise<{ lists?: { id: string; name: string }[]; error?: string }>;
    },
    enabled: connected && isAdmin && !!selectedBoardId,
    staleTime: 120_000,
  });

  const trelloLists = listsData?.lists ?? [];

  // ── Save settings ───────────────────────────────────────────────────────────
  const { mutate: saveSettings, isPending: saving } = useMutation({
    mutationFn: async () => {
      const mappings = trelloLists
        .filter((l) => statusMappings[l.id])
        .map((l) => ({
          listId: l.id,
          listName: l.name,
          feeduroStatus: statusMappings[l.id],
        }));

      const res = await fetch("/api/oauth2/integrations/trello", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "update_settings",
          defaultBoardId: selectedBoardId || undefined,
          defaultBoardName: selectedBoardName || undefined,
          defaultListId: selectedListId || undefined,
          defaultListName: selectedListName || undefined,
          autoCreateCards: autoCreate,
          statusMappings: mappings,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.error) throw new Error(json.error);
    },
    onSuccess: () => {
      toast.success("Trello settings saved");
      qc.invalidateQueries({ queryKey: ["trello-boards"] });
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Disconnect ──────────────────────────────────────────────────────────────
  async function handleDisconnect() {
    if (!confirm("Disconnect Trello? All linked card data will remain but new events won't sync."))
      return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/oauth2/integrations/trello", {
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
        <IntegrationPageHeader title="Trello" />

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
              <TrelloIcon size={24} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Trello Integration</h2>
              <p className="text-sm text-muted-foreground">
                Create and link Trello cards from feedback posts with bi-directional status sync.
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
                <span className="text-sm font-medium">Connect Trello</span>
              </div>
              {connected && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                    Connected{memberUsername ? ` · @${memberUsername}` : ""}
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
                  {webhookActive ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                      Webhook active — status sync is enabled
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-muted text-muted-foreground">
                      Webhook not active (select a board and save to enable sync)
                    </div>
                  )}

                  <a
                    href="/api/trello?intent=connect"
                    className="text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    Reconnect
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Authorize Feeduro to access your Trello boards. You'll be redirected to Trello's
                    login page.
                  </p>
                  <a
                    href="/api/trello?intent=connect"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: "#0052CC" }}
                  >
                    <TrelloIcon size={14} />
                    Connect Trello
                  </a>
                  <p className="text-sm text-muted-foreground">
                    Required: Get your API key from{" "}
                    <a
                      href="https://trello.com/app-key"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      trello.com/app-key
                      <ExternalLink className="inline h-2.5 w-2.5 ml-0.5" />
                    </a>{" "}
                    then set{" "}
                    <code className="text-[10px] bg-muted px-1 py-0.5 rounded">TRELLO_API_KEY</code>{" "}
                    and{" "}
                    <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                      TRELLO_API_SECRET
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
                    Cards created from feedback will go to this board.
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
                          setSelectedListId("");
                          setSelectedListName("");
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

                {/* Default list */}
                {selectedBoardId && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Default list</label>
                    <p className="text-sm text-muted-foreground mb-2">
                      New cards will be added to this list. Leave empty to use the first list.
                    </p>
                    {loadingLists ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Spinner className="size-3.5" />
                        Loading lists…
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={selectedListId}
                          onChange={(e) => {
                            const opt = e.target.options[e.target.selectedIndex];
                            setSelectedListId(e.target.value);
                            setSelectedListName(opt.text);
                          }}
                          className="w-full appearance-none px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary pr-8"
                        >
                          <option value="">— Board default —</option>
                          {trelloLists.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
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
                    <p className="text-sm font-medium">Auto-create cards</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically create a Trello card when a new feedback post is submitted.
                    </p>
                  </div>
                </div>

                {/* List → status mapping */}
                {selectedBoardId && trelloLists.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-0.5">Status mapping</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      When a Trello card moves to a list, automatically update the Feeduro post
                      status.
                    </p>

                    {loadingLists ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Spinner className="size-3.5" />
                        Loading lists…
                      </div>
                    ) : (
                      <div className="rounded-md border divide-y">
                        {trelloLists.map((l) => (
                          <div
                            key={l.id}
                            className="flex items-center justify-between px-3 py-2.5 gap-3"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="h-2 w-2 rounded-full shrink-0 bg-slate-400" />
                              <span className="text-sm truncate">{l.name}</span>
                            </div>
                            <span className="text-sm text-muted-foreground shrink-0">→</span>
                            <div className="relative shrink-0">
                              <select
                                value={statusMappings[l.id] ?? ""}
                                onChange={(e) =>
                                  setStatusMappings((prev) => {
                                    const next = { ...prev };
                                    if (e.target.value) next[l.id] = e.target.value;
                                    else delete next[l.id];
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

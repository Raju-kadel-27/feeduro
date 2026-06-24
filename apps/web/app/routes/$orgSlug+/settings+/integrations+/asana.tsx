import { Spinner } from "@components/ui/spinner";
import { requireOrgBySlug } from "@features/auth/server/guards";
import type { AsanaSettings } from "@features/internal/integrations/asana/server/schemas";
import { IntegrationPageHeader } from "@features/internal/integrations/components/integration-page-header";
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
import type { Route } from "./+types/asana";

export function meta() {
  return [{ title: "Asana Integration — Feeduro" }];
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
    }),
    getIntegration(organizationId, "asana"),
  ]);

  const isAdmin = memberRecord?.role === "admin";
  const settings = parseSettings<AsanaSettings>(integration?.settings ?? null);

  return {
    isAdmin,
    connected: !!integration?.accessToken,
    workspaceName: settings?.workspaceName ?? null,
    defaultProjectGid: settings?.defaultProjectGid ?? null,
    defaultProjectName: settings?.defaultProjectName ?? null,
    autoCreateIssues: settings?.autoCreateIssues ?? false,
    statusMappings: settings?.statusMappings ?? [],
    webhookActive: !!(settings?.webhookGid && settings.webhookSecret),
  };
}

function AsanaIcon({ size = 20 }: { size?: number }) {
  const r = size * 0.19;
  const cx = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={cx} cy={size * 0.38} r={r} fill="#F06A6A" />
      <circle cx={size * 0.3} cy={size * 0.65} r={r} fill="#F06A6A" />
      <circle cx={size * 0.7} cy={size * 0.65} r={r} fill="#F06A6A" />
    </svg>
  );
}

export default function AsanaIntegrationSettings({ loaderData }: Route.ComponentProps) {
  const {
    isAdmin,
    connected,
    workspaceName,
    defaultProjectGid: initialProjectGid,
    defaultProjectName: initialProjectName,
    autoCreateIssues: initialAutoCreate,
    statusMappings: initialMappings,
    webhookActive,
  } = loaderData;

  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();

  const [selectedProjectGid, setSelectedProjectGid] = useState(initialProjectGid ?? "");
  const [selectedProjectName, setSelectedProjectName] = useState(initialProjectName ?? "");
  const [autoCreate, setAutoCreate] = useState(initialAutoCreate);
  const [statusMappings, setStatusMappings] = useState<Record<string, string>>(() =>
    Object.fromEntries((initialMappings ?? []).map((m) => [m.sectionGid, m.feeduroStatus])),
  );
  const [disconnecting, setDisconnecting] = useState(false);

  // ── Fetch projects ──────────────────────────────────────────────────────────
  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ["asana-projects"],
    queryFn: async () => {
      const res = await fetch("/api/asana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "list_projects" }),
      });
      return res.json() as Promise<{ projects?: { gid: string; name: string }[]; error?: string }>;
    },
    enabled: connected && isAdmin,
    staleTime: 60_000,
  });

  // ── Fetch sections when a project is selected ───────────────────────────────
  const { data: sectionsData, isLoading: loadingSections } = useQuery({
    queryKey: ["asana-sections", selectedProjectGid],
    queryFn: async () => {
      const res = await fetch("/api/asana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "list_sections", projectGid: selectedProjectGid }),
      });
      return res.json() as Promise<{ sections?: { gid: string; name: string }[]; error?: string }>;
    },
    enabled: connected && isAdmin && !!selectedProjectGid,
    staleTime: 120_000,
  });

  const asanaSections = sectionsData?.sections ?? [];

  // ── Save settings ───────────────────────────────────────────────────────────
  const { mutate: saveSettings, isPending: saving } = useMutation({
    mutationFn: async () => {
      const mappings = asanaSections
        .filter((s) => statusMappings[s.gid])
        .map((s) => ({
          sectionGid: s.gid,
          sectionName: s.name,
          feeduroStatus: statusMappings[s.gid],
        }));

      // Also include the "__completed__" mapping if set
      if (statusMappings["__completed__"]) {
        mappings.push({
          sectionGid: "__completed__",
          sectionName: "Completed",
          feeduroStatus: statusMappings["__completed__"],
        });
      }

      const res = await fetch("/api/asana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "update_settings",
          defaultProjectGid: selectedProjectGid || undefined,
          defaultProjectName: selectedProjectName || undefined,
          autoCreateIssues: autoCreate,
          statusMappings: mappings,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.error) throw new Error(json.error);
    },
    onSuccess: () => {
      toast.success("Asana settings saved");
      qc.invalidateQueries({ queryKey: ["asana-projects"] });
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Disconnect ──────────────────────────────────────────────────────────────
  async function handleDisconnect() {
    if (!confirm("Disconnect Asana? All linked task data will remain but new events won't sync."))
      return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/asana", {
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
        <IntegrationPageHeader title="Asana" />

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
              <AsanaIcon size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Asana Integration</h2>
              <p className="text-sm text-muted-foreground">
                Create and link Asana tasks from feedback posts with bi-directional status sync.
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
                <span className="text-sm font-medium">Connect Asana</span>
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
                <div className="space-y-3">
                  {webhookActive ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                      Webhook active — status sync is enabled
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-muted text-muted-foreground">
                      Webhooks not active (localhost or registration failed) — status sync is
                      disabled
                    </div>
                  )}

                  <a
                    href="/api/asana?intent=connect"
                    className="text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    Reconnect
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Authorize Feeduro to access your Asana workspace. You'll be redirected to
                    Asana's login page.
                  </p>
                  <a
                    href="/api/asana?intent=connect"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: "#F06A6A" }}
                  >
                    <AsanaIcon size={14} />
                    Connect Asana
                  </a>
                  <p className="text-sm text-muted-foreground">
                    Required: Create an OAuth app at{" "}
                    <a
                      href="https://app.asana.com/0/my-apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      app.asana.com/0/my-apps
                      <ExternalLink className="inline h-2.5 w-2.5 ml-0.5" />
                    </a>{" "}
                    then set{" "}
                    <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                      ASANA_CLIENT_ID
                    </code>{" "}
                    and{" "}
                    <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                      ASANA_CLIENT_SECRET
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
                {/* Default project */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Default project</label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Tasks created from feedback will go here by default.
                  </p>
                  {loadingProjects ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner className="size-3.5" />
                      Loading projects…
                    </div>
                  ) : projectsData?.error ? (
                    <p className="text-sm text-destructive">{projectsData.error}</p>
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedProjectGid}
                        onChange={(e) => {
                          const opt = e.target.options[e.target.selectedIndex];
                          setSelectedProjectGid(e.target.value);
                          setSelectedProjectName(opt.text);
                        }}
                        className="w-full appearance-none px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary pr-8"
                      >
                        <option value="">— No default —</option>
                        {(projectsData?.projects ?? []).map((p) => (
                          <option key={p.gid} value={p.gid}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
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
                    <p className="text-sm font-medium">Auto-create tasks</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically create an Asana task when a new feedback post is submitted.
                    </p>
                  </div>
                </div>

                {/* Section → status mapping */}
                {selectedProjectGid && (
                  <div>
                    <p className="text-sm font-medium mb-0.5">Status mapping</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      When an Asana task moves to a section, automatically update the Feeduro post
                      status. Sections are the columns in your Asana project board.
                    </p>

                    {loadingSections ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Spinner className="size-3.5" />
                        Loading sections…
                      </div>
                    ) : asanaSections.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No sections found for this project.
                      </p>
                    ) : (
                      <div className="rounded-md border divide-y">
                        {/* Completed row */}
                        <div className="flex items-center justify-between px-3 py-2.5 gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2 w-2 rounded-full shrink-0 bg-green-500" />
                            <span className="text-sm truncate">Completed (task marked done)</span>
                          </div>
                          <span className="text-sm text-muted-foreground shrink-0">→</span>
                          <div className="relative shrink-0">
                            <select
                              value={statusMappings["__completed__"] ?? ""}
                              onChange={(e) =>
                                setStatusMappings((prev) => {
                                  const next = { ...prev };
                                  if (e.target.value) next["__completed__"] = e.target.value;
                                  else delete next["__completed__"];
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
                        {/* Section rows */}
                        {asanaSections.map((s) => (
                          <div
                            key={s.gid}
                            className="flex items-center justify-between px-3 py-2.5 gap-3"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="h-2 w-2 rounded-full shrink-0 bg-slate-400" />
                              <span className="text-sm truncate">{s.name}</span>
                            </div>
                            <span className="text-sm text-muted-foreground shrink-0">→</span>
                            <div className="relative shrink-0">
                              <select
                                value={statusMappings[s.gid] ?? ""}
                                onChange={(e) =>
                                  setStatusMappings((prev) => {
                                    const next = { ...prev };
                                    if (e.target.value) next[s.gid] = e.target.value;
                                    else delete next[s.gid];
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

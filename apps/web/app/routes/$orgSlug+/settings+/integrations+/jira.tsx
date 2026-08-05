import { Spinner } from "@components/ui/spinner";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { IntegrationPageHeader } from "@features/internal/integrations/components/integration-page-header";
import type { JiraSettings } from "@features/internal/integrations/jira/server/schemas";
import { getIntegration, parseSettings } from "@features/internal/integrations/server/queries";
import { cn } from "@lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, Unplug } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/jira";

export function meta() {
  return [{ title: "Jira Integration — Feeduro" }];
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
    getIntegration(db, organizationId, "jira"),
  ]);

  const isAdmin = memberRecord?.role === "admin";
  const settings = parseSettings<JiraSettings>(integration?.settings ?? null);

  return {
    isAdmin,
    connected: !!integration?.accessToken,
    cloudName: settings?.cloudName ?? null,
    cloudId: settings?.cloudId ?? null,
    cloudResources: settings?.cloudResources ?? [],
    defaultProjectKey: settings?.defaultProjectKey ?? null,
    autoCreateIssues: settings?.autoCreateIssues ?? false,
    statusMappings: settings?.statusMappings ?? [],
    webhookConfigured: !!(settings?.webhookIds?.length && settings.webhookSecret),
    webhookExpiresAt: settings?.webhookExpiresAt ?? null,
  };
}

function JiraIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path
        d="M15.975 0C12.146 7.935 13.18 5.828 7.81 16.434l8.165 8.165L31.95 8.634C31.95 8.634 19.804 13.811 15.975 0Z"
        fill="#2684FF"
      />
      <path
        d="M15.975 32c3.83-7.935 2.795-5.828 8.165-16.434l-8.165-8.165L0 23.366C0 23.366 12.146 18.189 15.975 32Z"
        fill="#2684FF"
      />
    </svg>
  );
}

function WebhookBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null;
  const expiryDate = new Date(expiresAt);
  const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const expired = daysLeft <= 0;
  const warning = daysLeft <= 7;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium",
        expired
          ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
          : warning
            ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
      )}
    >
      {expired ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
      {expired
        ? "Webhook expired — reconnect to resume sync"
        : warning
          ? `Webhook expires in ${daysLeft}d — reconnect to renew`
          : `Webhook active · expires ${expiryDate.toLocaleDateString()}`}
    </div>
  );
}

export default function JiraIntegrationSettings({ loaderData }: Route.ComponentProps) {
  const {
    isAdmin,
    connected,
    cloudName,
    cloudId,
    cloudResources,
    defaultProjectKey: initialProjectKey,
    autoCreateIssues: initialAutoCreate,
    statusMappings: initialMappings,
    webhookConfigured,
    webhookExpiresAt,
  } = loaderData;

  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();

  const [selectedProjectKey, setSelectedProjectKey] = useState(initialProjectKey ?? "");
  const [autoCreate, setAutoCreate] = useState(initialAutoCreate);
  const [statusMappings, setStatusMappings] = useState<Record<string, string>>(() =>
    Object.fromEntries((initialMappings ?? []).map((m) => [m.jiraStatusId, m.feeduroStatus])),
  );
  const [disconnecting, setDisconnecting] = useState(false);
  const [selectingCloud, setSelectingCloud] = useState(false);

  // ── Fetch projects when connected ───────────────────────────────────────────
  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ["jira-projects"],
    queryFn: async () => {
      const res = await fetch("/api/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "list_projects" }),
      });
      return res.json() as Promise<{
        projects?: { id: string; key: string; name: string }[];
        error?: string;
      }>;
    },
    enabled: connected && isAdmin,
    staleTime: 60_000,
  });

  // ── Fetch statuses when a project is selected ───────────────────────────────
  const { data: statusesData, isLoading: loadingStatuses } = useQuery({
    queryKey: ["jira-project-statuses", selectedProjectKey],
    queryFn: async () => {
      const res = await fetch("/api/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "list_project_statuses", projectKey: selectedProjectKey }),
      });
      return res.json() as Promise<{
        statuses?: { id: string; name: string; statusCategory: { key: string } }[];
        error?: string;
      }>;
    },
    enabled: connected && isAdmin && !!selectedProjectKey,
    staleTime: 120_000,
  });

  const jiraStatuses = statusesData?.statuses ?? [];

  // ── Save settings ───────────────────────────────────────────────────────────
  const { mutate: saveSettings, isPending: saving } = useMutation({
    mutationFn: async () => {
      const mappings = jiraStatuses
        .filter((s) => statusMappings[s.id])
        .map((s) => ({
          jiraStatusId: s.id,
          jiraStatusName: s.name,
          feeduroStatus: statusMappings[s.id],
        }));

      const res = await fetch("/api/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "update_settings",
          defaultProjectKey: selectedProjectKey || undefined,
          autoCreateIssues: autoCreate,
          statusMappings: mappings,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.error) throw new Error(json.error);
    },
    onSuccess: () => {
      toast.success("Jira settings saved");
      qc.invalidateQueries({ queryKey: ["jira-projects"] });
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Select cloud ────────────────────────────────────────────────────────────
  const { mutate: selectCloud } = useMutation({
    mutationFn: async (newCloudId: string) => {
      setSelectingCloud(true);
      const res = await fetch("/api/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "select_cloud", cloudId: newCloudId }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.error) throw new Error(json.error);
    },
    onSuccess: () => window.location.reload(),
    onError: (err) => {
      setSelectingCloud(false);
      toast.error(err.message);
    },
  });

  // ── Disconnect ──────────────────────────────────────────────────────────────
  async function handleDisconnect() {
    if (!confirm("Disconnect Jira? All linked issue data will remain but new events won't sync."))
      return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/jira", {
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
        <IntegrationPageHeader title="Jira" />

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
              <JiraIcon size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Jira Integration</h2>
              <p className="text-sm text-muted-foreground">
                Create and link Jira issues from feedback posts with bi-directional status sync.
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
                <span className="text-sm font-medium">Connect Jira</span>
              </div>
              {connected && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                    Connected{cloudName ? ` · ${cloudName}` : ""}
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
                  {/* Webhook expiry badge */}
                  {webhookConfigured && <WebhookBadge expiresAt={webhookExpiresAt} />}
                  {!webhookConfigured && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-muted text-muted-foreground">
                      <AlertTriangle className="h-3 w-3" />
                      Webhooks not active (localhost or registration failed) — status sync is
                      disabled
                    </div>
                  )}

                  {/* Cloud selector (shown when multiple instances) */}
                  {cloudResources.length > 1 && (
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1.5">
                        Jira Cloud instance
                      </label>
                      <div className="relative">
                        <select
                          value={cloudId ?? ""}
                          onChange={(e) => selectCloud(e.target.value)}
                          disabled={selectingCloud}
                          className="w-full appearance-none px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary pr-8"
                        >
                          {cloudResources.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  )}

                  <a
                    href="/api/jira?intent=connect"
                    className="text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    Reconnect
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Authorize Feeduro to access your Jira Cloud workspace. You'll be redirected to
                    Atlassian's login page.
                  </p>
                  <a
                    href="/api/jira?intent=connect"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[#2684FF] hover:bg-[#2684FF]/90 text-white transition-colors"
                  >
                    <JiraIcon size={14} />
                    Connect Jira
                  </a>
                  <p className="text-sm text-muted-foreground">
                    Required: Create an OAuth 2.0 (3LO) app at{" "}
                    <a
                      href="https://developer.atlassian.com/console/myapps/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      developer.atlassian.com
                      <ExternalLink className="inline h-2.5 w-2.5 ml-0.5" />
                    </a>{" "}
                    then set{" "}
                    <code className="text-[10px] bg-muted px-1 py-0.5 rounded">JIRA_CLIENT_ID</code>{" "}
                    and{" "}
                    <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                      JIRA_CLIENT_SECRET
                    </code>
                    .
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Step 2 — Configure (only shown when connected) */}
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
                    Issues created from feedback will go here by default.
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
                        value={selectedProjectKey}
                        onChange={(e) => setSelectedProjectKey(e.target.value)}
                        className="w-full appearance-none px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary pr-8"
                      >
                        <option value="">— No default —</option>
                        {(projectsData?.projects ?? []).map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.name} ({p.key})
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
                    <p className="text-sm font-medium">Auto-create issues</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically create a Jira issue when a new feedback post is submitted.
                    </p>
                  </div>
                </div>

                {/* Status mapping */}
                {selectedProjectKey && (
                  <div>
                    <p className="text-sm font-medium mb-0.5">Status mapping</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      When a Jira issue status changes, automatically update the Feeduro post
                      status.
                    </p>

                    {loadingStatuses ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Spinner className="size-3.5" />
                        Loading statuses…
                      </div>
                    ) : jiraStatuses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No statuses found for this project.
                      </p>
                    ) : (
                      <div className="rounded-md border divide-y">
                        {jiraStatuses.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between px-3 py-2.5 gap-3"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full shrink-0",
                                  s.statusCategory.key === "done"
                                    ? "bg-green-500"
                                    : s.statusCategory.key === "indeterminate"
                                      ? "bg-blue-500"
                                      : "bg-slate-400",
                                )}
                              />
                              <span className="text-sm truncate">{s.name}</span>
                            </div>
                            <span className="text-sm text-muted-foreground shrink-0">→</span>
                            <div className="relative shrink-0">
                              <select
                                value={statusMappings[s.id] ?? ""}
                                onChange={(e) =>
                                  setStatusMappings((prev) => {
                                    const next = { ...prev };
                                    if (e.target.value) next[s.id] = e.target.value;
                                    else delete next[s.id];
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

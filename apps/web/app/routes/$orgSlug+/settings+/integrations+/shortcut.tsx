import { ShortcutIcon } from "@components/icons";
import { Spinner } from "@components/ui/spinner";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { IntegrationPageHeader } from "@features/internal/integrations/components/integration-page-header";
import { getIntegration } from "@features/internal/integrations/server/queries";
import { cn } from "@lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/shortcut";

export function meta() {
  return [{ title: "Shortcut Integration — Feeduro" }];
}

export function shouldRevalidate() {
  return false;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const [integration, memberRecord] = await Promise.all([
    getIntegration(db, organizationId, "shortcut"),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
  ]);

  const settings = integration?.settings
    ? (JSON.parse(integration.settings) as {
        memberName?: string;
        mentionName?: string;
        defaultWorkflowId?: number;
        defaultWorkflowName?: string;
        defaultWorkflowStateId?: number;
        autoCreateStories?: boolean;
        statusMappings?: Array<{
          workflowStateId: number;
          workflowStateName: string;
          feeduroStatus: string;
        }>;
        webhookId?: string;
      })
    : null;

  return {
    integration: integration
      ? {
          connected: !!integration.accessToken,
          memberName: settings?.memberName ?? null,
          mentionName: settings?.mentionName ?? null,
          defaultWorkflowId: settings?.defaultWorkflowId ?? null,
          defaultWorkflowName: settings?.defaultWorkflowName ?? null,
          defaultWorkflowStateId: settings?.defaultWorkflowStateId ?? null,
          autoCreateStories: settings?.autoCreateStories ?? false,
          statusMappings: settings?.statusMappings ?? [],
          webhookConfigured: !!settings?.webhookId,
        }
      : null,
    isAdmin: memberRecord?.role === "admin",
  };
}

interface ShortcutWorkflowState {
  id: number;
  name: string;
  type: "unstarted" | "started" | "done";
}

interface ShortcutWorkflow {
  id: number;
  name: string;
  states: ShortcutWorkflowState[];
}

const FEEDURO_STATUSES = [
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Under Review" },
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
] as const;

async function callApi(body: object) {
  const res = await fetch("/api/shortcut", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { error?: string; [key: string]: unknown };
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

function WorkflowSelector({
  workflows,
  selected,
  onSelect,
}: {
  workflows: ShortcutWorkflow[];
  selected: number | null;
  onSelect: (workflowId: number, workflowName: string, firstStateId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedWorkflow = workflows.find((w) => w.id === selected);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
      >
        <span className={selectedWorkflow ? "text-foreground" : "text-muted-foreground"}>
          {selectedWorkflow ? selectedWorkflow.name : "Select a workflow…"}
        </span>
        <ChevronDown
          size={14}
          className={cn("text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {workflows.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                No workflows found
              </p>
            )}
            {workflows.map((wf) => (
              <button
                key={wf.id}
                type="button"
                onClick={() => {
                  const firstState = wf.states[0];
                  onSelect(wf.id, wf.name, firstState?.id ?? 0);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
              >
                <span className="truncate">{wf.name}</span>
                <span className="ml-auto text-sm text-muted-foreground shrink-0">
                  {wf.states.length} states
                </span>
                {wf.id === selected && <Check size={12} className="text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShortcutIntegrationSettings({ loaderData }: Route.ComponentProps) {
  const { integration, isAdmin } = loaderData;
  const revalidator = useRevalidator();

  const [apiToken, setApiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(
    integration?.defaultWorkflowId ?? null,
  );
  const [selectedWorkflowStateId, setSelectedWorkflowStateId] = useState<number | null>(
    integration?.defaultWorkflowStateId ?? null,
  );
  const [selectedWorkflowName, setSelectedWorkflowName] = useState<string | null>(
    integration?.defaultWorkflowName ?? null,
  );
  const [autoCreate, setAutoCreate] = useState(integration?.autoCreateStories ?? false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [statusMappings, setStatusMappings] = useState<Record<number, string>>(
    Object.fromEntries(
      (integration?.statusMappings ?? []).map((m) => [m.workflowStateId, m.feeduroStatus]),
    ),
  );

  const shortcutConnected = !!integration?.connected;

  const { data: workflows, isLoading: loadingWorkflows } = useQuery<ShortcutWorkflow[]>({
    queryKey: ["shortcut-workflows"],
    queryFn: async () => {
      const json = (await callApi({ intent: "list_workflows" })) as {
        workflows?: ShortcutWorkflow[];
      };
      return json.workflows ?? [];
    },
    enabled: shortcutConnected,
  });

  const selectedWorkflow = (workflows ?? []).find((w) => w.id === selectedWorkflowId);

  const { mutate: connect, isPending: connecting } = useMutation({
    mutationFn: () => callApi({ intent: "connect", apiToken }),
    onSuccess: (res) => {
      const r = res as { memberName?: string };
      toast.success(`Connected as ${r.memberName ?? "Shortcut user"}`);
      setApiToken("");
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: saveSettings, isPending: saving } = useMutation({
    mutationFn: () =>
      callApi({
        intent: "update_settings",
        defaultWorkflowId: selectedWorkflowId,
        defaultWorkflowName: selectedWorkflowName,
        defaultWorkflowStateId: selectedWorkflowStateId,
        autoCreateStories: autoCreate,
        statusMappings: (selectedWorkflow?.states ?? [])
          .filter((s) => statusMappings[s.id])
          .map((s) => ({
            workflowStateId: s.id,
            workflowStateName: s.name,
            feeduroStatus: statusMappings[s.id],
          })),
      }),
    onSuccess: () => {
      toast.success("Shortcut settings saved");
      setSettingsDirty(false);
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: disconnect, isPending: disconnecting } = useMutation({
    mutationFn: () => callApi({ intent: "disconnect" }),
    onSuccess: () => {
      toast.success("Shortcut integration removed");
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
        <>
        <IntegrationPageHeader title="Shortcut Integration" />

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Shortcut</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create Shortcut stories from feedback and keep your product backlog in sync.
            </p>
          </div>

          {/* Step 1: Connect */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                1
              </span>
              <h3 className="text-sm font-semibold text-foreground">
                Connect your Shortcut workspace
              </h3>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                  <ShortcutIcon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Shortcut</p>
                  <p className="text-sm text-muted-foreground">
                    {shortcutConnected
                      ? integration.memberName
                        ? `Connected as ${integration.memberName}${integration.mentionName ? ` (@${integration.mentionName})` : ""}`
                        : "Workspace connected"
                      : "Not connected"}
                  </p>
                </div>
                {shortcutConnected && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full">
                      <Check size={11} />
                      Connected
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => disconnect()}
                        disabled={disconnecting}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                      >
                        <Unplug size={12} />
                        {disconnecting ? "Disconnecting…" : "Disconnect"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {!shortcutConnected && isAdmin && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Generate an API token from{" "}
                    <strong className="text-foreground">Shortcut → Settings → API Tokens</strong>,
                    then paste it below.
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showToken ? "text" : "password"}
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                        placeholder="Paste your API token…"
                        className="w-full px-3 py-2 text-sm border rounded-md bg-background pr-8 focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={!apiToken.trim() || connecting}
                      onClick={() => connect()}
                      className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
                    >
                      {connecting ? <Spinner className="size-3" /> : <Check size={12} />}
                      Connect
                    </button>
                  </div>
                </div>
              )}

              {shortcutConnected && isAdmin && (
                <p className="text-sm text-muted-foreground">
                  To reconnect with a different token, disconnect first then enter a new token.
                </p>
              )}
            </div>
          </section>

          {/* Step 2: Configure */}
          <section
            className={cn("space-y-3", !shortcutConnected && "opacity-40 pointer-events-none")}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                2
              </span>
              <h3 className="text-sm font-semibold text-foreground">Configure</h3>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Default workflow</p>
                <p className="text-sm text-muted-foreground">
                  Stories will be created in this workflow unless overridden per-card.
                </p>
                {isAdmin && loadingWorkflows && (
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Spinner className="size-3" />
                    Loading workflows…
                  </div>
                )}
                {isAdmin && !loadingWorkflows && (
                  <WorkflowSelector
                    workflows={workflows ?? []}
                    selected={selectedWorkflowId}
                    onSelect={(id, name, firstStateId) => {
                      setSelectedWorkflowId(id);
                      setSelectedWorkflowName(name);
                      setSelectedWorkflowStateId(firstStateId);
                      setSettingsDirty(true);
                    }}
                  />
                )}
                {!isAdmin && integration?.defaultWorkflowName && (
                  <p className="text-sm text-foreground">{integration.defaultWorkflowName}</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 pt-1 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-create stories</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Automatically create a Shortcut story when new feedback is submitted.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoCreate}
                  disabled={!isAdmin}
                  onClick={() => {
                    setAutoCreate((v) => !v);
                    setSettingsDirty(true);
                  }}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    autoCreate ? "bg-primary" : "bg-input",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                      autoCreate ? "translate-x-4" : "translate-x-0",
                    )}
                  />
                </button>
              </div>

              {/* Status mapping */}
              {selectedWorkflow && (
                <div className="pt-1 border-t border-border space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Status mapping</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      When a Shortcut story moves to one of these states, the linked Feeduro post
                      status updates automatically.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {selectedWorkflow.states.map((state) => (
                      <div key={state.id} className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            state.type === "done"
                              ? "bg-green-500"
                              : state.type === "started"
                                ? "bg-blue-500"
                                : "bg-muted-foreground",
                          )}
                        />
                        <span className="text-sm text-foreground w-32 truncate">{state.name}</span>
                        <ArrowRight size={11} className="text-muted-foreground shrink-0" />
                        <select
                          value={statusMappings[state.id] ?? ""}
                          disabled={!isAdmin}
                          onChange={(e) => {
                            setStatusMappings((prev) => ({ ...prev, [state.id]: e.target.value }));
                            setSettingsDirty(true);
                          }}
                          className="flex-1 text-sm rounded border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                        >
                          <option value="">— no mapping —</option>
                          {FEEDURO_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isAdmin && settingsDirty && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveSettings()}
                    className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {saving ? <Spinner className="size-3" /> : <Check size={12} />}
                    Save settings
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* How to use */}
          {shortcutConnected && (
            <section className="rounded-lg border border-border bg-muted/10 px-4 py-3 space-y-2">
              <p className="text-sm font-medium text-foreground">Using the integration</p>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Link2 size={11} className="mt-0.5 shrink-0 text-muted-foreground/60" />
                  Open any feedback card and click{" "}
                  <strong className="text-foreground">Create Story</strong> to push it to Shortcut.
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Link2 size={11} className="mt-0.5 shrink-0 text-muted-foreground/60" />
                  Stories are created in{" "}
                  <strong className="text-foreground">
                    {selectedWorkflowName ?? "your selected workflow"}
                  </strong>{" "}
                  with the feedback description as the story description.
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ExternalLink size={11} className="mt-0.5 shrink-0 text-muted-foreground/60" />A
                  link back to the Shortcut story (e.g.{" "}
                  <strong className="text-foreground">SC-42</strong>) is shown on each card.
                </li>
              </ul>
            </section>
          )}

        </main>
        </>
  );
}

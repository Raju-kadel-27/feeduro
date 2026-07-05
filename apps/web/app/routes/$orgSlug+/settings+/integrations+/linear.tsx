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
  Link2,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/linear";

export function meta() {
  return [{ title: "Linear Integration — Feeduro" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const [integration, memberRecord] = await Promise.all([
    getIntegration(db, organizationId, "linear"),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
    }),
  ]);

  const settings = integration?.settings
    ? (JSON.parse(integration.settings) as {
        workspaceId?: string;
        workspaceName?: string;
        defaultTeamId?: string;
        autoCreateIssues?: boolean;
      })
    : null;

  return {
    integration: integration
      ? {
          connected: !!integration.accessToken,
          workspaceName: settings?.workspaceName ?? null,
          defaultTeamId: settings?.defaultTeamId ?? null,
          autoCreateIssues: settings?.autoCreateIssues ?? false,
          statusMappings: settings?.statusMappings ?? [],
          webhookConfigured: !!settings?.webhookId,
        }
      : null,
    isAdmin: memberRecord?.role === "admin",
  };
}

interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

interface LinearState {
  id: string;
  name: string;
  type: string;
  color: string;
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
  const res = await fetch("/api/linear", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { error?: string; [key: string]: unknown };
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

function TeamSelector({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (teamId: string, teamName: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["linear-teams"],
    queryFn: async () => {
      const json = (await callApi({ intent: "list_teams" })) as { teams?: LinearTeam[] };
      return json.teams ?? [];
    },
    enabled: open,
  });

  const selectedTeam = data?.find((t) => t.id === selected);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
      >
        <span className={selectedTeam ? "text-foreground" : "text-muted-foreground"}>
          {selectedTeam ? `${selectedTeam.key} — ${selectedTeam.name}` : "Select a team…"}
        </span>
        <ChevronDown
          size={14}
          className={cn("text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Spinner className="size-3.5" />
                Loading teams…
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-destructive">
                <AlertCircle size={14} />
                {error.message}
              </div>
            )}
            {!isLoading && (data ?? []).length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">No teams found</p>
            )}
            {(data ?? []).map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => {
                  onSelect(team.id, team.name);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
              >
                <span className="text-sm font-mono text-muted-foreground w-12 shrink-0">
                  {team.key}
                </span>
                <span className="truncate">{team.name}</span>
                {team.id === selected && <Check size={12} className="ml-auto text-primary" />}
              </button>
            ))}
          </div>
          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw size={11} />
              Refresh list
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LinearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden fill="currentColor">
      <path d="M1.22 61.08 38.92 98.78a50.08 50.08 0 0 1-37.7-37.7ZM0 49.08l50.92 50.92A50 50 0 0 1 0 49.08ZM10.08 15.5 84.5 89.92A50 50 0 0 1 10.08 15.5ZM17.83 8.55l73.62 73.62A50 50 0 0 1 17.83 8.55ZM30.92 2.5 97.5 69.08A50 50 0 0 1 30.92 2.5ZM49.92 0a50.08 50.08 0 0 1 50.08 49.92L49.92 0Z" />
    </svg>
  );
}

export default function LinearIntegrationSettings({ loaderData }: Route.ComponentProps) {
  const { integration, isAdmin } = loaderData;
  const revalidator = useRevalidator();

  const linearConnected = !!integration?.connected;

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    integration?.defaultTeamId ?? null,
  );
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null);
  const [autoCreate, setAutoCreate] = useState(integration?.autoCreateIssues ?? false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  // statusMappings: linearStateId → feeduroStatus
  const [statusMappings, setStatusMappings] = useState<Record<string, string>>(
    Object.fromEntries(
      (integration?.statusMappings ?? []).map((m) => [m.linearStateId, m.feeduroStatus]),
    ),
  );

  const { data: teamStates, isLoading: loadingStates } = useQuery({
    queryKey: ["linear-team-states", selectedTeamId],
    queryFn: async () => {
      const json = (await callApi({ intent: "list_team_states", teamId: selectedTeamId })) as {
        states?: LinearState[];
      };
      return json.states ?? [];
    },
    enabled: !!selectedTeamId && linearConnected,
  });

  const { mutate: saveSettings, isPending: saving } = useMutation({
    mutationFn: () =>
      callApi({
        intent: "update_settings",
        defaultTeamId: selectedTeamId,
        autoCreateIssues: autoCreate,
        statusMappings: (teamStates ?? [])
          .filter((s) => statusMappings[s.id])
          .map((s) => ({
            linearStateId: s.id,
            linearStateName: s.name,
            feeduroStatus: statusMappings[s.id],
          })),
      }),
    onSuccess: () => {
      toast.success("Linear settings saved");
      setSettingsDirty(false);
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: disconnect, isPending: disconnecting } = useMutation({
    mutationFn: () => callApi({ intent: "disconnect" }),
    onSuccess: () => {
      toast.success("Linear integration removed");
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
        <>
        <IntegrationPageHeader title="Linear Integration" />

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Linear</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create Linear issues from feedback and keep your product roadmap in sync.
            </p>
          </div>

          {/* Step 1: Connect Linear workspace */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                1
              </span>
              <h3 className="text-sm font-semibold text-foreground">
                Connect your Linear workspace
              </h3>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                  <LinearIcon className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Linear</p>
                  <p className="text-sm text-muted-foreground">
                    {linearConnected
                      ? integration.workspaceName
                        ? `Connected to ${integration.workspaceName}`
                        : "Workspace connected"
                      : "Not connected"}
                  </p>
                </div>
                {linearConnected ? (
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
                ) : (
                  isAdmin && (
                    <a
                      href="/api/linear?intent=connect"
                      className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-secondary/80 transition-colors"
                    >
                      <LinearIcon className="h-3 w-3" />
                      Connect Linear
                    </a>
                  )
                )}
              </div>
            </div>
          </section>

          {/* Step 2: Configure */}
          <section
            className={cn("space-y-3", !linearConnected && "opacity-40 pointer-events-none")}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                2
              </span>
              <h3 className="text-sm font-semibold text-foreground">Configure</h3>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Default team</p>
                <p className="text-sm text-muted-foreground">
                  Issues will be created in this team unless overridden per-card.
                </p>
                {isAdmin && (
                  <TeamSelector
                    selected={selectedTeamId}
                    onSelect={(id, name) => {
                      setSelectedTeamId(id);
                      setSelectedTeamName(name);
                      setSettingsDirty(true);
                    }}
                  />
                )}
                {!isAdmin && integration?.defaultTeamId && (
                  <p className="text-sm text-foreground">Team configured</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 pt-1 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-create issues</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Automatically create a Linear issue when new feedback is submitted.
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
              {selectedTeamId && (
                <div className="pt-1 border-t border-border space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Status mapping</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      When a Linear issue moves to one of these states, the linked Feeduro post
                      status updates automatically.
                    </p>
                  </div>

                  {loadingStates && (
                    <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                      <Spinner className="size-3" />
                      Loading states…
                    </div>
                  )}

                  {(teamStates ?? []).length > 0 && (
                    <div className="space-y-1.5">
                      {(teamStates ?? []).map((state) => (
                        <div key={state.id} className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: state.color }}
                          />
                          <span className="text-sm text-foreground w-28 truncate">
                            {state.name}
                          </span>
                          <ArrowRight size={11} className="text-muted-foreground shrink-0" />
                          <select
                            value={statusMappings[state.id] ?? ""}
                            disabled={!isAdmin}
                            onChange={(e) => {
                              setStatusMappings((prev) => ({
                                ...prev,
                                [state.id]: e.target.value,
                              }));
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
                  )}
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
          {linearConnected && (
            <section className="rounded-lg border border-border bg-muted/10 px-4 py-3 space-y-2">
              <p className="text-sm font-medium text-foreground">Using the integration</p>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Link2 size={11} className="mt-0.5 shrink-0 text-muted-foreground/60" />
                  Open any roadmap card and click{" "}
                  <strong className="text-foreground">Create Issue</strong> to push it to Linear.
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Link2 size={11} className="mt-0.5 shrink-0 text-muted-foreground/60" />
                  Issues appear in your Linear team as{" "}
                  <strong className="text-foreground font-mono">
                    {selectedTeamName ?? "the selected team"}
                  </strong>{" "}
                  with the feedback description as the issue body.
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ExternalLink size={11} className="mt-0.5 shrink-0 text-muted-foreground/60" />A
                  link back to the Linear issue (e.g.{" "}
                  <strong className="text-foreground">ENG-42</strong>) is shown on each card.
                </li>
              </ul>
            </section>
          )}

        </main>
        </>
  );
}

import { Spinner } from "@components/ui/spinner";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { IntegrationPageHeader } from "@features/internal/integrations/components/integration-page-header";
import { getIntegration } from "@features/internal/integrations/server/queries";
import { cn } from "@lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ExternalLink,
  GitBranch,
  Link2,
  RefreshCw,
  Settings2,
  Unlink,
  Unplug,
} from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/github";

export function meta() {
  return [{ title: "GitHub Integration — Feeduro" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const [integration, memberRecord] = await Promise.all([
    getIntegration(db, organizationId, "github"),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
  ]);

  const settings = integration?.settings
    ? (JSON.parse(integration.settings) as {
        repoOwner?: string;
        repoName?: string;
        autoCreateIssues?: boolean;
      })
    : null;

  return {
    integration: settings?.repoOwner
      ? {
          repoOwner: settings.repoOwner,
          repoName: settings.repoName ?? "",
          autoCreateIssues: settings.autoCreateIssues ?? false,
        }
      : null,
    isAdmin: memberRecord?.role === "admin",
    githubConnected: !!integration?.accessToken,
  };
}

interface GithubRepo {
  id: number;
  full_name: string;
  owner: { login: string };
  name: string;
  private: boolean;
}

async function callApi(body: object) {
  const res = await fetch("/api/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { error?: string; [key: string]: unknown };
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

function RepoSelector({ onSelect }: { onSelect: (owner: string, name: string) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["github-repos"],
    queryFn: async () => {
      const json = (await callApi({ intent: "list_repos" })) as { repos?: GithubRepo[] };
      return json.repos ?? [];
    },
    enabled: open,
  });

  const filtered = (data ?? []).filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
      >
        <span className="text-muted-foreground">Select a repository…</span>
        <ChevronDown
          size={14}
          className={cn("text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              type="text"
              placeholder="Search repositories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-background rounded border border-border focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Spinner className="size-3.5" />
                Loading repositories…
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-destructive">
                <AlertCircle size={14} />
                {error.message}
              </div>
            )}
            {!isLoading && filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                No repositories found
              </p>
            )}
            {filtered.map((repo) => (
              <button
                key={repo.id}
                type="button"
                onClick={() => {
                  onSelect(repo.owner.login, repo.name);
                  setOpen(false);
                  setSearch("");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
              >
                <GitBranch size={13} className="text-muted-foreground shrink-0" />
                <span className="truncate">{repo.full_name}</span>
                {repo.private && (
                  <span className="ml-auto text-[10px] text-muted-foreground border border-border rounded px-1">
                    private
                  </span>
                )}
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

export default function GithubIntegrationSettings({ loaderData }: Route.ComponentProps) {
  const { integration, isAdmin, githubConnected } = loaderData;
  const revalidator = useRevalidator();

  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; name: string } | null>(null);
  const [autoCreate, setAutoCreate] = useState(integration?.autoCreateIssues ?? false);

  const { mutate: saveRepo, isPending: saving } = useMutation({
    mutationFn: () =>
      callApi({
        intent: "save_repo",
        repoOwner: selectedRepo?.owner,
        repoName: selectedRepo?.name,
        autoCreateIssues: autoCreate,
      }),
    onSuccess: () => {
      toast.success("GitHub integration saved");
      setSelectedRepo(null);
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: toggleAutoCreate, isPending: togglingAuto } = useMutation({
    mutationFn: (enabled: boolean) => callApi({ intent: "toggle_auto_create", enabled }),
    onSuccess: (_, enabled) => {
      toast.success(enabled ? "Auto-create enabled" : "Auto-create disabled");
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: disconnect, isPending: disconnecting } = useMutation({
    mutationFn: () => callApi({ intent: "disconnect" }),
    onSuccess: () => {
      toast.success("GitHub integration removed");
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const activeRepo = selectedRepo
    ? `${selectedRepo.owner}/${selectedRepo.name}`
    : integration
      ? `${integration.repoOwner}/${integration.repoName}`
      : null;

  return (
        <>
        <IntegrationPageHeader title="GitHub Integration" />

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
          <div>
            <h2 className="text-sm font-semibold text-foreground">GitHub Issues</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Link your roadmap items to GitHub Issues. Create new issues from feedback or sync
              existing ones.
            </p>
          </div>

          {/* Step 1: Connect GitHub */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                1
              </span>
              <h3 className="text-sm font-semibold text-foreground">
                Connect your GitHub account
              </h3>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                  <GitBranch size={16} className="text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">GitHub</p>
                  <p className="text-sm text-muted-foreground">
                    {githubConnected ? "Workspace connected" : "Not connected"}
                  </p>
                </div>
                {githubConnected ? (
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
                      href="/api/github?intent=connect"
                      className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-secondary/80 transition-colors"
                    >
                      <GitBranch size={12} />
                      Connect GitHub
                    </a>
                  )
                )}
              </div>
            </div>
          </section>

          {/* Step 2: Pick repository */}
          <section
            className={cn("space-y-3", !githubConnected && "opacity-40 pointer-events-none")}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                2
              </span>
              <h3 className="text-sm font-semibold text-foreground">Select a repository</h3>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              {integration && !selectedRepo ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <GitBranch size={13} className="text-muted-foreground shrink-0" />
                    <span className="font-mono text-foreground">
                      {integration.repoOwner}/{integration.repoName}
                    </span>
                    <a
                      href={`https://github.com/${integration.repoOwner}/${integration.repoName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedRepo({
                          owner: integration.repoOwner,
                          name: integration.repoName,
                        })
                      }
                      className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                      title="Change repository"
                    >
                      <Settings2 size={14} />
                    </button>
                  )}
                </div>
              ) : (
                isAdmin && (
                  <RepoSelector onSelect={(owner, name) => setSelectedRepo({ owner, name })} />
                )
              )}

              {selectedRepo && (
                <div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
                  <GitBranch size={13} className="text-primary shrink-0" />
                  <span className="font-mono text-foreground flex-1">
                    {selectedRepo.owner}/{selectedRepo.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedRepo(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Unlink size={12} />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pt-1 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-create issues</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Automatically create a GitHub issue when new feedback is submitted.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoCreate}
                  disabled={!isAdmin || togglingAuto}
                  onClick={() => {
                    const next = !autoCreate;
                    setAutoCreate(next);
                    if (integration) toggleAutoCreate(next);
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

              {isAdmin && (selectedRepo || !integration) && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={!selectedRepo || saving}
                    onClick={() => saveRepo()}
                    className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {saving ? <Spinner className="size-3" /> : <Check size={12} />}
                    {integration ? "Update repository" : "Save integration"}
                  </button>
                  {selectedRepo && integration && (
                    <button
                      type="button"
                      onClick={() => setSelectedRepo(null)}
                      className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          {integration && (
            <section className="rounded-lg border border-border bg-muted/10 px-4 py-3 space-y-2">
              <p className="text-sm font-medium text-foreground">Using the integration</p>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Link2 size={11} className="mt-0.5 shrink-0 text-muted-foreground/60" />
                  Open any roadmap card and click{" "}
                  <strong className="text-foreground">Create Issue</strong> to push it to{" "}
                  <span className="font-mono text-foreground">
                    {integration.repoOwner}/{integration.repoName}
                  </span>
                  .
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Link2 size={11} className="mt-0.5 shrink-0 text-muted-foreground/60" />
                  Or paste an existing issue URL on the card to link it.
                </li>
              </ul>
            </section>
          )}

        </main>
        </>
  );
}

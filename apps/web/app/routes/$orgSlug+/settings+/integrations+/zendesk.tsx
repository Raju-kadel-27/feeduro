import { Spinner } from "@components/ui/spinner";
import { IntegrationPageHeader } from "@features/integrations/components/integration-page-header";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { getIntegration, parseSettings } from "@features/integrations/server/queries";
import type { ZendeskSettings } from "@features/integrations/zendesk/server/schemas";
import { cn } from "@lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getEnv } from "@utils/get-env";
import { and, eq } from "drizzle-orm";
import { ExternalLink, Unplug } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { getDb } from "@/db";
import { member } from "@/db/schema";
import type { Route } from "./+types/zendesk";

export function meta() {
  return [{ title: "Zendesk Integration — Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const env = getEnv();
  const db = getDb();

  const [memberRecord, integration] = await Promise.all([
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
    getIntegration(organizationId, "zendesk"),
  ]);

  const settings = parseSettings<ZendeskSettings>(integration?.settings ?? null);

  return {
    configured: !!(env.ZENDESK_CLIENT_ID && env.ZENDESK_CLIENT_SECRET),
    isAdmin: memberRecord?.role === "admin",
    connected: !!integration?.accessToken,
    subdomain: settings?.subdomain ?? null,
    accountName: settings?.accountName ?? null,
    autoCreateTickets: settings?.autoCreateTickets ?? false,
  };
}

function ZendeskLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#03363D" />
      <path d="M14 7a5 5 0 0 1 5 5v.5H9V12a5 5 0 0 1 5-5zM9 14h10l-5 7-5-7z" fill="white" />
    </svg>
  );
}

export default function ZendeskIntegrationSettings({ loaderData }: Route.ComponentProps) {
  const { configured, isAdmin, connected, subdomain, accountName, autoCreateTickets } = loaderData;

  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();

  const [inputSubdomain, setInputSubdomain] = useState("");
  const [autoCreate, setAutoCreate] = useState(autoCreateTickets);
  const [disconnecting, setDisconnecting] = useState(false);

  const { mutate: saveSettings, isPending: saving } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/zendesk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "update_settings", autoCreateTickets: autoCreate }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.error) throw new Error(json.error);
    },
    onSuccess: () => {
      toast.success("Zendesk settings saved");
      qc.invalidateQueries({ queryKey: ["zendesk"] });
    },
    onError: (err) => toast.error(err.message),
  });

  async function handleDisconnect() {
    if (
      !confirm("Disconnect Zendesk? Existing ticket links will remain but new events won't sync.")
    )
      return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/zendesk", {
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
        <IntegrationPageHeader title="Zendesk" />

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
              <ZendeskLogo size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Zendesk Integration</h2>
              <p className="text-xs text-muted-foreground">
                Create Zendesk tickets from feedback posts and keep support in sync.
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
                <span className="text-sm font-medium">Connect Zendesk</span>
              </div>
              {connected && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                    Connected
                    {accountName
                      ? ` · ${accountName}`
                      : subdomain
                        ? ` · ${subdomain}.zendesk.com`
                        : ""}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
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
                  href={`/api/zendesk?intent=connect&subdomain=${subdomain}`}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Reconnect
                </a>
              ) : (
                <div className="space-y-3">
                  {!configured && (
                    <p className="text-[11px] text-muted-foreground">
                      Set{" "}
                      <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                        ZENDESK_CLIENT_ID
                      </code>{" "}
                      and{" "}
                      <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                        ZENDESK_CLIENT_SECRET
                      </code>{" "}
                      to enable this integration. Create an OAuth client at{" "}
                      <a
                        href="https://developer.zendesk.com/documentation/live-chat/getting-started/auth/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Zendesk Developer Portal
                        <ExternalLink className="inline h-2.5 w-2.5 ml-0.5" />
                      </a>
                      .
                    </p>
                  )}
                  <div className="space-y-2">
                    <label htmlFor="zendesk-subdomain" className="block text-xs font-medium">
                      Your Zendesk subdomain
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="zendesk-subdomain"
                        type="text"
                        value={inputSubdomain}
                        onChange={(e) =>
                          setInputSubdomain(
                            e.target.value
                              .trim()
                              .toLowerCase()
                              .replace(/\.zendesk\.com.*$/, ""),
                          )
                        }
                        placeholder="yourcompany"
                        disabled={!isAdmin || !configured}
                        className="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        .zendesk.com
                      </span>
                    </div>
                    <a
                      href={
                        inputSubdomain
                          ? `/api/zendesk?intent=connect&subdomain=${encodeURIComponent(inputSubdomain)}`
                          : "#"
                      }
                      onClick={(e) => {
                        if (!inputSubdomain || !isAdmin || !configured) e.preventDefault();
                      }}
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                        inputSubdomain && isAdmin && configured
                          ? "bg-foreground text-background hover:bg-foreground/90"
                          : "bg-muted text-muted-foreground cursor-not-allowed",
                      )}
                    >
                      <ZendeskLogo size={14} />
                      Connect Zendesk
                    </a>
                  </div>
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
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoCreate}
                    onClick={() => isAdmin && setAutoCreate((v) => !v)}
                    disabled={!isAdmin}
                    className={cn(
                      "relative shrink-0 h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50",
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
                    <p className="text-xs font-medium">Auto-create tickets</p>
                    <p className="text-[11px] text-muted-foreground">
                      Automatically open a Zendesk ticket when a new feedback post is submitted.
                    </p>
                  </div>
                </div>

                {isAdmin && (
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
                )}
              </div>
            </section>
          )}
        </main>
        </>
  );
}

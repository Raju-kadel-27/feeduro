import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { Spinner } from "@components/ui/spinner";
import { requireOrgBySlug } from "@features/auth/server/guards";
import type { HubSpotSettings } from "@features/integrations/hubspot/server/schemas";
import { getIntegration, parseSettings } from "@features/integrations/server/queries";
import { AppSidebar } from "@features/layout/components/app-sidebar/app-sidebar";
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
import type { Route } from "./+types/hubspot";

export function meta() {
  return [{ title: "HubSpot Integration — Feediyo" }];
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
    getIntegration(organizationId, "hubspot"),
  ]);

  const settings = parseSettings<HubSpotSettings>(integration?.settings ?? null);

  return {
    configured: !!(env.HUBSPOT_CLIENT_ID && env.HUBSPOT_CLIENT_SECRET),
    isAdmin: memberRecord?.role === "admin",
    connected: !!integration?.accessToken,
    portalId: settings?.portalId ?? null,
    hubDomain: settings?.hubDomain ?? null,
    autoCreateDeals: settings?.autoCreateDeals ?? false,
  };
}

function HubSpotLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#FF7A59" />
      <circle cx="17.5" cy="10.5" r="2.5" fill="white" />
      <path
        d="M17.5 13v2.5M17.5 8V5.5M14.5 10.5H12M20.5 10.5H23M15.7 8.7 14 7M19.3 12.3 21 14"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M14.5 16.5C14.5 15.12 13.38 14 12 14H9.5A2.5 2.5 0 0 0 7 16.5v.5a2.5 2.5 0 0 0 2.5 2.5H12c1.38 0 2.5-1.12 2.5-2.5v-.5Z"
        fill="white"
      />
    </svg>
  );
}

export default function HubSpotIntegrationSettings({ loaderData }: Route.ComponentProps) {
  const { configured, isAdmin, connected, portalId, hubDomain, autoCreateDeals } = loaderData;

  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();

  const [autoCreate, setAutoCreate] = useState(autoCreateDeals);
  const [disconnecting, setDisconnecting] = useState(false);

  const { mutate: saveSettings, isPending: saving } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/hubspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "update_settings", autoCreateDeals: autoCreate }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.error) throw new Error(json.error);
    },
    onSuccess: () => {
      toast.success("HubSpot settings saved");
      qc.invalidateQueries({ queryKey: ["hubspot"] });
    },
    onError: (err) => toast.error(err.message),
  });

  async function handleDisconnect() {
    if (!confirm("Disconnect HubSpot? Existing deal links will remain but new events won't sync."))
      return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/hubspot", {
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

  const connectedLabel = hubDomain
    ? `Connected · ${hubDomain}`
    : portalId
      ? `Connected · Portal ${portalId}`
      : "Connected";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm text-muted-foreground">
            <Link to={`/${orgSlug}/settings/integrations`} className="hover:text-foreground">
              Integrations
            </Link>
            {" / "}
          </span>
          <span className="text-sm font-medium">HubSpot</span>
        </header>

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
              <HubSpotLogo size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">HubSpot Integration</h2>
              <p className="text-xs text-muted-foreground">
                Link HubSpot contacts and deals to feedback posts. Track revenue opportunity from
                your feedback.
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
                <span className="text-sm font-medium">Connect HubSpot</span>
              </div>
              {connected && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                  {connectedLabel}
                </span>
              )}
            </div>

            <div className="p-4 space-y-3">
              {connected ? (
                <div className="flex items-center gap-2">
                  <a
                    href="/api/hubspot?intent=connect"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Reconnect
                  </a>
                  <span className="text-muted-foreground/40">·</span>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    <Unplug className="h-3 w-3" />
                    {disconnecting ? "Disconnecting…" : "Disconnect"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {!configured && (
                    <p className="text-[11px] text-muted-foreground">
                      Set{" "}
                      <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                        HUBSPOT_CLIENT_ID
                      </code>{" "}
                      and{" "}
                      <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                        HUBSPOT_CLIENT_SECRET
                      </code>{" "}
                      to enable this integration. Create an OAuth app at{" "}
                      <a
                        href="https://developers.hubspot.com/docs/api/oauth-quickstart-guide"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        HubSpot Developer Portal
                        <ExternalLink className="inline h-2.5 w-2.5 ml-0.5" />
                      </a>
                      .
                    </p>
                  )}
                  <a
                    href={isAdmin && configured ? "/api/hubspot?intent=connect" : "#"}
                    onClick={(e) => {
                      if (!isAdmin || !configured) e.preventDefault();
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                      isAdmin && configured
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "bg-muted text-muted-foreground cursor-not-allowed",
                    )}
                  >
                    <HubSpotLogo size={14} />
                    Connect HubSpot
                  </a>
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
                    <p className="text-xs font-medium">Auto-create deals</p>
                    <p className="text-[11px] text-muted-foreground">
                      Automatically create a HubSpot deal when a new feedback post is submitted.
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
      </SidebarInset>
    </SidebarProvider>
  );
}

import { Spinner } from "@components/ui/spinner";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { IntegrationPageHeader } from "@features/internal/integrations/components/integration-page-header";
import type { SalesforceSettings } from "@features/internal/integrations/salesforce/server/schemas";
import { getIntegration, parseSettings } from "@features/internal/integrations/server/queries";
import { cn } from "@lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getEnv } from "@utils/get-env";
import { and, eq } from "drizzle-orm";
import { ExternalLink, Unplug } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/salesforce";

export function meta() {
  return [{ title: "Salesforce Integration — Feeduro" }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);
  const env = getEnv();

  const [memberRecord, integration] = await Promise.all([
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
    getIntegration(db, organizationId, "salesforce"),
  ]);

  const settings = parseSettings<SalesforceSettings>(integration?.settings ?? null);

  return {
    configured: !!(env.SALESFORCE_CLIENT_ID && env.SALESFORCE_CLIENT_SECRET),
    isAdmin: memberRecord?.role === "admin",
    connected: !!integration?.accessToken,
    instanceUrl: settings?.instanceUrl ?? null,
    displayName: settings?.displayName ?? null,
    autoCreateOpportunities: settings?.autoCreateOpportunities ?? false,
  };
}

function SalesforceLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#00A1E0" />
      <path
        d="M11.8 18.5a3.2 3.2 0 0 1-3.2-3.2 3.2 3.2 0 0 1 3.2-3.2c.28 0 .55.04.8.1A3.8 3.8 0 0 1 15.8 10a3.8 3.8 0 0 1 3.8 3.8c0 .07 0 .14-.01.21A2.6 2.6 0 0 1 21 16.4a2.6 2.6 0 0 1-2.6 2.6H11.8Z"
        fill="white"
      />
    </svg>
  );
}

export default function SalesforceIntegrationSettings({ loaderData }: Route.ComponentProps) {
  const { configured, isAdmin, connected, instanceUrl, displayName, autoCreateOpportunities } =
    loaderData;

  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();

  const [autoCreate, setAutoCreate] = useState(autoCreateOpportunities);
  const [disconnecting, setDisconnecting] = useState(false);

  const { mutate: saveSettings, isPending: saving } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/salesforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "update_settings",
          autoCreateOpportunities: autoCreate,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.error) throw new Error(json.error);
    },
    onSuccess: () => {
      toast.success("Salesforce settings saved");
      qc.invalidateQueries({ queryKey: ["salesforce"] });
    },
    onError: (err) => toast.error(err.message),
  });

  async function handleDisconnect() {
    if (
      !confirm(
        "Disconnect Salesforce? Existing opportunity links will remain but new events won't sync.",
      )
    )
      return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/salesforce", {
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

  const connectedLabel = displayName
    ? `Connected · ${displayName}`
    : instanceUrl
      ? `Connected · ${instanceUrl.replace("https://", "")}`
      : "Connected";

  return (
        <>
        <IntegrationPageHeader title="Salesforce" />

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
              <SalesforceLogo size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Salesforce Integration</h2>
              <p className="text-sm text-muted-foreground">
                Capture feedback from cases, contacts, leads, and opportunities. Track revenue
                opportunity directly from your feedback posts.
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
                <span className="text-sm font-medium">Authenticate Salesforce</span>
              </div>
              {connected && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                    {connectedLabel}
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
                  href="/api/salesforce?intent=connect"
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  Reconnect
                </a>
              ) : (
                <div className="space-y-3">
                  {!configured && (
                    <p className="text-sm text-muted-foreground">
                      Set{" "}
                      <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                        SALESFORCE_CLIENT_ID
                      </code>{" "}
                      and{" "}
                      <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
                        SALESFORCE_CLIENT_SECRET
                      </code>{" "}
                      to enable this integration. Create a Connected App at{" "}
                      <a
                        href="https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Salesforce Setup
                        <ExternalLink className="inline h-2.5 w-2.5 ml-0.5" />
                      </a>
                      .
                    </p>
                  )}
                  <a
                    href={isAdmin && configured ? "/api/salesforce?intent=connect" : "#"}
                    onClick={(e) => {
                      if (!isAdmin || !configured) e.preventDefault();
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                      isAdmin && configured
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground cursor-not-allowed",
                    )}
                  >
                    <SalesforceLogo size={14} />
                    Authenticate with Salesforce
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
                    <p className="text-sm font-medium">Auto-create opportunities</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically create a Salesforce opportunity when a new feedback post is
                      submitted.
                    </p>
                  </div>
                </div>

                {isAdmin && (
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
                )}
              </div>
            </section>
          )}
        </main>
        </>
  );
}

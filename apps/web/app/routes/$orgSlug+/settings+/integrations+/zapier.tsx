import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { Spinner } from "@components/ui/spinner";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { getIntegration, parseSettings } from "@features/integrations/server/queries";
import type { ZapierSettings } from "@features/integrations/zapier/server/schemas";
import { AppSidebar } from "@features/layout/components/app-sidebar/app-sidebar";
import { cn } from "@lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { CheckSquare, ExternalLink, Square, Unplug } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { getDb } from "@/db";
import { member } from "@/db/schema";
import type { Route } from "./+types/zapier";

export function meta() {
  return [{ title: "Zapier Integration — Feediyo" }];
}

const ALL_EVENTS = [
  { id: "feedback.created", label: "Feedback created" },
  { id: "feedback.status_changed", label: "Feedback status changed" },
  { id: "comment.created", label: "Comment posted" },
  { id: "changelog.created", label: "Changelog created" },
  { id: "changelog.published", label: "Changelog published" },
] as const;

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const [memberRecord, integration] = await Promise.all([
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
    getIntegration(organizationId, "zapier"),
  ]);

  const settings = parseSettings<ZapierSettings>(integration?.settings ?? null);

  return {
    isAdmin: memberRecord?.role === "admin",
    connected: !!integration?.accessToken,
    webhookUrl: integration?.accessToken ?? null,
    events: settings?.events ?? ["*"],
  };
}

function ZapierLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#FF4A00" />
      <path d="M15.5 4L7 15h6.5l-3 9L19.5 13H13l2.5-9z" fill="white" />
    </svg>
  );
}

export default function ZapierIntegrationSettings({ loaderData }: Route.ComponentProps) {
  const {
    isAdmin,
    connected: initialConnected,
    webhookUrl: initialUrl,
    events: initialEvents,
  } = loaderData;

  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();

  const [webhookUrl, setWebhookUrl] = useState(initialUrl ?? "");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    initialEvents.includes("*") ? ALL_EVENTS.map((e) => e.id) : initialEvents,
  );
  const [connected, setConnected] = useState(initialConnected);

  function toggleEvent(id: string) {
    setSelectedEvents((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  const { mutate: saveSettings, isPending: saving } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/zapier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "save", webhookUrl, events: selectedEvents }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.error) throw new Error(json.error);
    },
    onSuccess: () => {
      toast.success("Zapier webhook saved");
      setConnected(true);
      qc.invalidateQueries({ queryKey: ["zapier"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: sendTest, isPending: testing } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/zapier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "test" }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.error) throw new Error(json.error);
    },
    onSuccess: () => toast.success("Test event sent to Zapier"),
    onError: (err) => toast.error(err.message),
  });

  const { mutate: disconnect, isPending: disconnecting } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/zapier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "disconnect" }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.error) throw new Error(json.error);
    },
    onSuccess: () => {
      toast.success("Zapier disconnected");
      setConnected(false);
      setWebhookUrl("");
      setSelectedEvents(ALL_EVENTS.map((e) => e.id));
    },
    onError: (err) => toast.error(err.message),
  });

  function handleDisconnect() {
    if (!confirm("Disconnect Zapier? Events will stop being sent to your Zaps.")) return;
    disconnect();
  }

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
          <span className="text-sm font-medium">Zapier</span>
        </header>

        <main className="p-6 max-w-[600px] mx-auto w-full space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
              <ZapierLogo size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Zapier Integration</h2>
              <p className="text-xs text-muted-foreground">
                Send Feediyo events to 7,000+ apps via Zapier.
              </p>
            </div>
          </div>

          {/* Step 1 — Create Zap */}
          <section className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
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
              <span className="text-sm font-medium">Create a Zap in Zapier</span>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                In Zapier, create a new Zap and choose{" "}
                <strong className="text-foreground">Webhooks by Zapier</strong> as the trigger.
                Select <strong className="text-foreground">Catch Hook</strong>, then copy the
                webhook URL Zapier provides.
              </p>
              <a
                href="https://zapier.com/apps/webhook/integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Open Zapier
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </section>

          {/* Step 2 — Paste webhook URL + select events */}
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
                  2
                </span>
                <span className="text-sm font-medium">Configure webhook</span>
              </div>
              {connected && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                  Connected
                </span>
              )}
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label htmlFor="zapier-webhook-url" className="block text-xs font-medium mb-1.5">
                  Zapier Catch Hook URL
                </label>
                <input
                  id="zapier-webhook-url"
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/hooks/catch/…"
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>

              <div>
                <p className="text-xs font-medium mb-2">Events to send</p>
                <div className="space-y-1.5">
                  {ALL_EVENTS.map((ev) => {
                    const checked = selectedEvents.includes(ev.id);
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => isAdmin && toggleEvent(ev.id)}
                        disabled={!isAdmin}
                        className="flex w-full items-center gap-2 text-xs text-left hover:text-foreground text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {checked ? (
                          <CheckSquare className="h-3.5 w-3.5 shrink-0 text-primary" />
                        ) : (
                          <Square className="h-3.5 w-3.5 shrink-0" />
                        )}
                        {ev.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => saveSettings()}
                    disabled={saving || !webhookUrl || selectedEvents.length === 0}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
                  >
                    {saving ? (
                      <>
                        <Spinner className="size-3.5" />
                        Saving…
                      </>
                    ) : (
                      "Save"
                    )}
                  </button>
                  {connected && (
                    <button
                      type="button"
                      onClick={() => sendTest()}
                      disabled={testing}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted disabled:opacity-50 transition-colors"
                    >
                      {testing ? (
                        <>
                          <Spinner className="size-3.5" />
                          Sending…
                        </>
                      ) : (
                        "Send test event"
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Disconnect */}
          {connected && isAdmin && (
            <section className="rounded-lg border border-destructive/30 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                <span className="text-sm font-medium text-destructive">Danger zone</span>
              </div>
              <div className="p-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Remove the Zapier webhook. Events will stop being forwarded.
                </p>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-destructive/40 text-destructive hover:bg-destructive/5 disabled:opacity-50 transition-colors"
                >
                  <Unplug className="h-3 w-3" />
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              </div>
            </section>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

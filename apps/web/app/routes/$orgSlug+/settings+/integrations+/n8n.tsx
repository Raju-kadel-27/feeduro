import { Spinner } from "@components/ui/spinner";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { IntegrationPageHeader } from "@features/internal/integrations/components/integration-page-header";
import type { N8nSettings } from "@features/internal/integrations/n8n/server/schemas";
import { getIntegration, parseSettings } from "@features/internal/integrations/server/queries";
import { cn } from "@lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { CheckSquare, ExternalLink, Square, Unplug } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";
import type { Route } from "./+types/n8n";

export function meta() {
  return [{ title: "n8n Integration — Feeduro" }];
}

const ALL_EVENTS = [
  { id: "feedback.created", label: "Feedback created" },
  { id: "feedback.status_changed", label: "Feedback status changed" },
  { id: "comment.created", label: "Comment posted" },
  { id: "changelog.created", label: "Changelog created" },
  { id: "changelog.published", label: "Changelog published" },
] as const;

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const [memberRecord, integration] = await Promise.all([
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
    getIntegration(db, organizationId, "n8n"),
  ]);

  const settings = parseSettings<N8nSettings>(integration?.settings ?? null);

  return {
    isAdmin: memberRecord?.role === "admin",
    connected: !!integration?.accessToken,
    webhookUrl: integration?.accessToken ?? null,
    events: settings?.events ?? ["*"],
  };
}

function N8nLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#EA4B71" />
      <path
        d="M7 10.5C7 9.12 8.12 8 9.5 8S12 9.12 12 10.5c0 .9-.48 1.68-1.2 2.12L14 17.5l3.2-4.88A2.497 2.497 0 0 1 16 10.5C16 9.12 17.12 8 18.5 8S21 9.12 21 10.5 19.88 13 18.5 13c-.18 0-.35-.02-.52-.06L14 19.5l-3.98-6.56c-.17.04-.34.06-.52.06C8.12 13 7 11.88 7 10.5Z"
        fill="white"
      />
    </svg>
  );
}

export default function N8nIntegrationSettings({ loaderData }: Route.ComponentProps) {
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
      const res = await fetch("/api/n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "save", webhookUrl, events: selectedEvents }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.error) throw new Error(json.error);
    },
    onSuccess: () => {
      toast.success("n8n webhook saved");
      setConnected(true);
      qc.invalidateQueries({ queryKey: ["n8n"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: sendTest, isPending: testing } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "test" }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.error) throw new Error(json.error);
    },
    onSuccess: () => toast.success("Test event sent to n8n"),
    onError: (err) => toast.error(err.message),
  });

  const { mutate: disconnect, isPending: disconnecting } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "disconnect" }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.error) throw new Error(json.error);
    },
    onSuccess: () => {
      toast.success("n8n disconnected");
      setConnected(false);
      setWebhookUrl("");
      setSelectedEvents(ALL_EVENTS.map((e) => e.id));
    },
    onError: (err) => toast.error(err.message),
  });

  function handleDisconnect() {
    if (!confirm("Disconnect n8n? Events will stop being sent to your workflows.")) return;
    disconnect();
  }

  return (
        <>
        <IntegrationPageHeader title="n8n" />

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
              <N8nLogo size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">n8n Integration</h2>
              <p className="text-sm text-muted-foreground">
                Send Feeduro events to your n8n workflows via webhook.
              </p>
            </div>
          </div>

          {/* Step 1 — Create workflow */}
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
              <span className="text-sm font-medium">Create a workflow in n8n</span>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                In n8n, create a new workflow and add a{" "}
                <strong className="text-foreground">Webhook</strong> trigger node. Set the HTTP
                method to <strong className="text-foreground">POST</strong>, then copy the{" "}
                <strong className="text-foreground">Production URL</strong> it provides.
              </p>
              <a
                href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                n8n Webhook docs
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </section>

          {/* Step 2 — Paste URL + select events */}
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
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                    Connected
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

            <div className="p-4 space-y-4">
              <div>
                <label htmlFor="n8n-webhook-url" className="block text-sm font-medium mb-1.5">
                  n8n Webhook URL
                </label>
                <input
                  id="n8n-webhook-url"
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-n8n.instance.com/webhook/…"
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Events to send</p>
                <div className="space-y-1.5">
                  {ALL_EVENTS.map((ev) => {
                    const checked = selectedEvents.includes(ev.id);
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => isAdmin && toggleEvent(ev.id)}
                        disabled={!isAdmin}
                        className="flex w-full items-center gap-2 text-sm text-left hover:text-foreground text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
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

        </main>
        </>
  );
}

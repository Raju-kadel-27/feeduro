import { useState, useEffect } from "react";
import { data, useFetcher } from "react-router";
import { z } from "zod";
import { createApiClient } from "@lib/api-client.server";
import { getEnv } from "@lib/env.server";
import { getActiveApiUrl } from "@lib/env-override.server";
import { verifyWebhookSignature } from "@lib/hmac.server";
import { clearEvents, listEvents, pushEvent, type StoredEvent } from "@lib/webhook-store.server";
import type { Route } from "./+types/webhooks";

export function meta(): Route.MetaDescriptors {
  return [{ title: "Webhooks · Feediyo Demo" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  return data({ events: listEvents(), receiverUrl: new URL("/webhooks", request.url).href });
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = getEnv(context);

  if (request.method === "DELETE") { clearEvents(); return data({ ok: true }); }

  // E2E trigger: create a real post so Feediyo fires a feedback.created webhook
  if (request.method === "PUT") {
    const api = createApiClient(getActiveApiUrl(request, env), env.FEEDIYO_API_KEY);
    const boards = await api.get("/v1/boards", z.object({ data: z.array(z.object({ id: z.string() })) }));
    const boardId = boards.data?.data[0]?.id;
    if (!boardId) return data({ triggered: false, error: "No boards found" });
    const post = await api.post("/v1/posts", { boardId, title: `E2E test · ${new Date().toLocaleTimeString()}` }, z.object({ data: z.object({ id: z.string() }) }));
    return data({ triggered: !post.error, postId: post.data?.data.id ?? null, error: post.error });
  }

  // Incoming webhook from Feediyo
  if (request.method !== "POST") return data({ error: "Method not allowed" }, { status: 405 });
  const body = await request.text();
  const signatureHeader = request.headers.get("x-webhook-signature") ?? "";
  const eventHeader = request.headers.get("x-webhook-event") ?? "unknown";
  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(body) as Record<string, unknown>; } catch { return data({ error: "Invalid JSON" }, { status: 400 }); }
  const valid = signatureHeader && env.FEEDIYO_WEBHOOK_SECRET
    ? await verifyWebhookSignature(body, env.FEEDIYO_WEBHOOK_SECRET, signatureHeader) : false;
  pushEvent({ receivedAt: new Date().toISOString(), event: eventHeader, signatureHeader, valid, payload });
  return data({ ok: true });
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <div className="p-8 text-sm text-red-600">{error instanceof Error ? error.message : "Error."}</div>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="shrink-0 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function EventCard({ ev }: { ev: StoredEvent }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`overflow-hidden rounded-xl border bg-white ${ev.valid ? "border-emerald-200" : "border-amber-200"}`}>
      <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
        <span className={`h-2 w-2 shrink-0 rounded-full ${ev.valid ? "bg-emerald-400" : "bg-amber-400"}`} />
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ev.valid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{ev.valid ? "✓ valid" : "⚠ invalid sig"}</span>
        <span className="font-mono text-sm font-medium text-gray-800">{ev.event}</span>
        <span className="ml-auto shrink-0 text-xs text-gray-400">{new Date(ev.receivedAt).toLocaleTimeString()}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`size-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && <pre className="border-t border-gray-100 bg-gray-900 px-4 py-3 text-xs leading-relaxed text-emerald-300 overflow-x-auto">{JSON.stringify(ev.payload, null, 2)}</pre>}
    </div>
  );
}

export default function WebhooksPage({ loaderData }: Route.ComponentProps) {
  const poller = useFetcher<typeof loader>();
  const trigger = useFetcher<typeof action>();
  const events = poller.data?.events ?? loaderData.events;

  useEffect(() => {
    const t = setInterval(() => poller.load("/webhooks"), 3000);
    return () => clearInterval(t);
  }, [poller]);

  return (
    <>
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Webhook Receiver</h1>
            <p className="mt-1 text-sm text-gray-500">Receives and HMAC-verifies events. Auto-refreshes every 3 s.</p>
          </div>
          <poller.Form method="DELETE" action="/webhooks">
            <button type="submit" className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">Clear all</button>
          </poller.Form>
        </div>
      </div>
      <div className="space-y-4 p-8">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-500">Receiver URL</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 truncate rounded-lg border border-indigo-200 bg-white px-3 py-2 font-mono text-sm text-gray-800">{loaderData.receiverUrl}</code>
            <CopyButton text={loaderData.receiverUrl} />
          </div>
          <p className="mt-2 text-xs text-indigo-600">Paste into Settings → Webhooks. Copy the signing secret into <code className="font-mono">FEEDIYO_WEBHOOK_SECRET</code>.</p>
        </div>

        {/* E2E trigger */}
        <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">End-to-end test</p>
            <p className="text-xs text-gray-500">Creates a real post → Feediyo fires <code className="font-mono">feedback.created</code> → should appear below.</p>
          </div>
          <trigger.Form method="PUT" action="/webhooks">
            <button type="submit" disabled={trigger.state !== "idle"} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {trigger.state !== "idle" ? "Triggering…" : "Trigger Event →"}
            </button>
          </trigger.Form>
          {trigger.data && "triggered" in trigger.data && (
            <span className={`text-xs font-medium ${trigger.data.triggered ? "text-emerald-600" : "text-red-600"}`}>
              {trigger.data.triggered ? `Post ${trigger.data.postId?.slice(0, 8)}… created` : trigger.data.error}
            </span>
          )}
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="mb-3 size-8 text-gray-300"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            <p className="text-sm font-medium text-gray-500">Waiting for events</p>
            <p className="mt-1 text-xs text-gray-400">Use Trigger Event or create something in Feediyo.</p>
          </div>
        ) : (
          <div className="space-y-2">{events.map(ev => <EventCard key={ev.id} ev={ev} />)}</div>
        )}
      </div>
    </>
  );
}

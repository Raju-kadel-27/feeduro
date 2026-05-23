import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { AppSidebar } from "@features/layout/components/app-sidebar/app-sidebar";
import { cn } from "@lib/utils";
import { useMutation } from "@tanstack/react-query";
import { and, desc, eq } from "drizzle-orm";
import { AlertCircle, Check, Copy, Key, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { getDb } from "@/db";
import { apikey, member } from "@/db/schema";

import type { Route } from "./+types/api-tokens";

export function meta() {
  return [{ title: "API Tokens — Feediyo" }];
}

interface ApiKeyRow {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  lastRequest: Date | null;
  enabled: boolean;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const [keys, memberRecord] = await Promise.all([
    db.query.apikey.findMany({
      where: eq(apikey.referenceId, organizationId),
      columns: {
        id: true,
        name: true,
        start: true,
        prefix: true,
        createdAt: true,
        expiresAt: true,
        lastRequest: true,
        enabled: true,
      },
      orderBy: [desc(apikey.createdAt)],
    }),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
    }),
  ]);

  return {
    keys: keys as ApiKeyRow[],
    isAdmin: memberRecord?.role === "admin",
  };
}

const EXPIRY_OPTIONS = [
  { label: "No expiration", value: null },
  { label: "30 days", value: 60 * 60 * 24 * 30 },
  { label: "90 days", value: 60 * 60 * 24 * 90 },
  { label: "1 year", value: 60 * 60 * 24 * 365 },
] as const;

function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy"
      className={cn(
        "p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors bg-muted/10 hover:bg-muted/20",
        className,
      )}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(date));
}

export default function ApiTokensSettings({ loaderData }: Route.ComponentProps) {
  const { keys, isAdmin } = loaderData;
  const revalidator = useRevalidator();

  const [name, setName] = useState("");
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  async function callApi(body: object) {
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { error?: string; key?: { key: string } };
    if (!res.ok) throw new Error(json.error ?? "Request failed");
    return json;
  }

  const { mutate: createKey, isPending: creating } = useMutation({
    mutationFn: () => callApi({ intent: "create", name, expiresIn }),
    onSuccess: (result) => {
      const key = (result as { key?: { key: string } }).key?.key ?? null;
      setNewKey(key);
      setName("");
      setExpiresIn(null);
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: deleteKey, isPending: deleting } = useMutation({
    mutationFn: (keyId: string) => callApi({ intent: "delete", keyId }),
    onSuccess: () => {
      toast.success("API key deleted");
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-4 border-b px-6 bg-muted/10">
          <SidebarTrigger className="-ml-1" />
          <span className="text-lg font-semibold">API Tokens</span>
        </header>

        <main className="p-8 max-w-[720px] mx-auto w-full space-y-10">
          <div>
            <h2 className="text-base font-bold text-foreground">API Tokens</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Generate tokens to authenticate API requests for this workspace.
            </p>
          </div>

          {/* One-time key reveal */}
          {newKey && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6 space-y-4 shadow-md">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertCircle size={16} />
                <span className="text-sm font-semibold">
                  Copy your API key now — it won't be shown again
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <code className="text-sm font-mono text-foreground flex-1 break-all">{newKey}</code>
                <CopyButton value={newKey} />
              </div>
              <button
                type="button"
                onClick={() => setNewKey(null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                I've saved my key
              </button>
            </div>
          )}

          {/* Keys table */}
          <section>
            <h3 className="text-base font-bold text-foreground mb-4">Active Keys</h3>

            {keys.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center bg-muted/10">
                <Key size={24} className="mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No API keys yet.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden bg-card shadow-md">
                <div className="grid grid-cols-[1fr_auto_auto] items-center px-4 h-12 bg-muted/20 border-b border-border gap-4">
                  <div className="text-sm text-muted-foreground">Name</div>
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="text-sm text-muted-foreground pr-8">Expires</div>
                </div>
                <ul>
                  {keys.map((k, i) => (
                    <li
                      key={k.id}
                      className={cn(
                        "grid grid-cols-[1fr_auto-auto] items-center px-4 py-3 gap-4",
                        i !== 0 && "border-t border-border",
                        !k.enabled && "opacity-50",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {k.name ?? "Unnamed"}
                          </span>
                          {!k.enabled && (
                            <span className="text-xs font-medium px-2 py-1 rounded bg-destructive/10 text-destructive shrink-0">
                              disabled
                            </span>
                          )}
                        </div>
                        {k.start && (
                          <code className="text-xs text-muted-foreground font-mono mt-1 block">
                            {k.start}••••••••
                          </code>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDate(k.createdAt)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                          {k.expiresAt ? formatDate(k.expiresAt) : "Never"}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => deleteKey(k.id)}
                            disabled={deleting}
                            title="Delete key"
                            className="p-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground disabled:opacity-50 ml-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isAdmin && (
              <section>
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 mt-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors shadow-sm"
                    >
                      <Plus size={16} />
                      <span>Generate New Key</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>New API Key</DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        createKey();
                      }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. CI / Production"
                          required
                          maxLength={32}
                          className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Expiration</label>
                        <select
                          value={expiresIn ?? ""}
                          onChange={(e) =>
                            setExpiresIn(e.target.value === "" ? null : Number(e.target.value))
                          }
                          className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {EXPIRY_OPTIONS.map((opt) => (
                            <option key={String(opt.value)} value={opt.value ?? ""}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-4 pt-2">
                        <button
                          type="submit"
                          disabled={creating || !name.trim()}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          {creating ? "Generating…" : "Generate Key"}
                        </button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </section>
            )}
          </section>

          {/* Usage hint */}
          <section className="rounded-lg border border-border bg-muted/10 px-6 py-4 space-y-4 shadow-md">
            <p className="text-sm font-medium text-foreground">Using the API</p>
            <p className="text-sm text-muted-foreground">
              Pass your token in the <code className="font-mono text-foreground">x-api-key</code>{" "}
              header with every request.
            </p>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <code className="text-sm font-mono text-muted-foreground flex-1">
                curl -H "x-api-key: fdy_••••••••" https://api.feediyo.com/v1/...
              </code>
            </div>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

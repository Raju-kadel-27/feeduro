import { PageTitle } from "@components/common/page-title";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { cn } from "@lib/utils";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Check, Copy, Key, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { auth } from "@/app/lib/auth/server";

import type { Route } from "./+types/oauth-clients";

export function meta() {
  return [{ title: "OAuth Apps — Feeduro" }];
}

// RFC 7591 format returned by getOAuthClients
interface OAuthClientRow {
  client_id: string;
  client_name?: string;
  redirect_uris?: string[];
  token_endpoint_auth_method?: string;
  client_id_issued_at?: number;
  disabled?: boolean;
  public?: boolean;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireOrgBySlug(request, params.orgSlug);

  const result = await auth.api.getOAuthClients({ headers: request.headers });
  const clients = (result?.data ?? []) as OAuthClientRow[];

  return { clients };
}

const CreateClientSchema = z.object({
  intent: z.literal("create"),
  name: z.string().min(1).max(64),
  redirectUris: z.string().min(1),
  isPublic: z.enum(["true", "false"]).transform((v) => v === "true"),
});

const DeleteClientSchema = z.object({
  intent: z.literal("delete"),
  clientId: z.string().min(1),
});

const RotateSecretSchema = z.object({
  intent: z.literal("rotate"),
  clientId: z.string().min(1),
});

export async function action({ request, params }: Route.ActionArgs) {
  await requireOrgBySlug(request, params.orgSlug);

  const raw = await request.json();
  const discriminator = z.object({ intent: z.string() }).safeParse(raw);
  if (!discriminator.success) return { error: "Invalid request" };

  const { intent } = discriminator.data;

  if (intent === "create") {
    const parsed = CreateClientSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

    const { name, redirectUris, isPublic } = parsed.data;
    const uris = redirectUris
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean);

    if (uris.length === 0) return { error: "At least one redirect URI is required" };

    const result = await auth.api.createOAuthClient({
      headers: request.headers,
      body: {
        client_name: name,
        redirect_uris: uris,
        token_endpoint_auth_method: isPublic ? "none" : "client_secret_basic",
      },
    });

    return { created: result?.data ?? null };
  }

  if (intent === "delete") {
    const parsed = DeleteClientSchema.safeParse(raw);
    if (!parsed.success) return { error: "Invalid input" };

    await auth.api.deleteOAuthClient({
      headers: request.headers,
      body: { client_id: parsed.data.clientId },
    });

    return { deleted: true };
  }

  if (intent === "rotate") {
    const parsed = RotateSecretSchema.safeParse(raw);
    if (!parsed.success) return { error: "Invalid input" };

    const result = await auth.api.rotateClientSecret({
      headers: request.headers,
      body: { client_id: parsed.data.clientId },
    });

    return { secret: (result?.data as { client_secret?: string })?.client_secret ?? null };
  }

  return { error: "Unknown intent" };
}

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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

export function ErrorBoundary() {
  return <div className="p-6 text-sm text-destructive">Failed to load OAuth apps. Please refresh and try again.</div>;
}

export default function OAuthClientsSettings({ loaderData }: Route.ComponentProps) {
  const { clients } = loaderData as { clients: OAuthClientRow[] };
  const revalidator = useRevalidator();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [redirectUris, setRedirectUris] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const [newCredentials, setNewCredentials] = useState<{
    clientId: string;
    clientSecret: string | null;
    name: string;
  } | null>(null);

  const [rotatedSecret, setRotatedSecret] = useState<{ clientId: string; secret: string } | null>(null);

  async function callAction(body: object) {
    const res = await fetch(window.location.pathname, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok || json.error) throw new Error((json.error as string) ?? "Request failed");
    return json;
  }

  const { mutate: createClient, isPending: creating } = useMutation({
    mutationFn: () =>
      callAction({ intent: "create", name, redirectUris, isPublic: String(isPublic) }),
    onSuccess: (result) => {
      const created = result.created as {
        client_id?: string;
        client_secret?: string;
        client_name?: string;
      } | null;
      if (created?.client_id) {
        setNewCredentials({
          clientId: created.client_id,
          clientSecret: created.client_secret ?? null,
          name: created.client_name ?? name,
        });
      }
      setName("");
      setRedirectUris("");
      setIsPublic(false);
      setCreateOpen(false);
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: deleteClient, isPending: deleting } = useMutation({
    mutationFn: (clientId: string) => callAction({ intent: "delete", clientId }),
    onSuccess: () => {
      toast.success("OAuth app deleted");
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: rotateSecret, isPending: rotating } = useMutation({
    mutationFn: (clientId: string) => callAction({ intent: "rotate", clientId }),
    onSuccess: (result, clientId) => {
      const secret = result.secret as string | null;
      if (secret) setRotatedSecret({ clientId, secret });
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <>
      <PageTitle
        title="OAuth Apps"
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus size={16} />
                New App
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register OAuth App</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createClient();
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">App name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Integration"
                    required
                    maxLength={64}
                    className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    Redirect URIs{" "}
                    <span className="text-xs opacity-60">(one per line)</span>
                  </label>
                  <textarea
                    value={redirectUris}
                    onChange={(e) => setRedirectUris(e.target.value)}
                    placeholder="https://myapp.com/callback"
                    required
                    rows={3}
                    className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded border-border"
                  />
                  <label htmlFor="isPublic" className="text-sm">
                    Public client{" "}
                    <span className="text-muted-foreground text-xs">(native / SPA — no client secret)</span>
                  </label>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={creating || !name.trim() || !redirectUris.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {creating ? "Creating…" : "Create App"}
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
        {/* One-time credentials reveal after creation */}
        {newCredentials && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle size={16} />
              <span className="text-sm font-semibold">
                Save your credentials — the client secret won&apos;t be shown again
              </span>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Client ID</div>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <code className="text-sm font-mono flex-1 break-all">{newCredentials.clientId}</code>
                <CopyButton value={newCredentials.clientId} />
              </div>
            </div>
            {newCredentials.clientSecret && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Client Secret</div>
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                  <code className="text-sm font-mono flex-1 break-all">{newCredentials.clientSecret}</code>
                  <CopyButton value={newCredentials.clientSecret} />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setNewCredentials(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              I&apos;ve saved my credentials
            </button>
          </div>
        )}

        {/* Rotated secret reveal */}
        {rotatedSecret && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle size={16} />
              <span className="text-sm font-semibold">New client secret — won&apos;t be shown again</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <code className="text-sm font-mono flex-1 break-all">{rotatedSecret.secret}</code>
              <CopyButton value={rotatedSecret.secret} />
            </div>
            <button
              type="button"
              onClick={() => setRotatedSecret(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              I&apos;ve saved the secret
            </button>
          </div>
        )}

        {/* Clients table */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Registered Apps</h3>
          </div>

          {clients.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center bg-muted/10">
              <Key size={24} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mb-1">No OAuth apps yet.</p>
              <p className="text-xs text-muted-foreground/70">
                Register an app to let external services authenticate users via your workspace.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden bg-card">
              <div className="grid grid-cols-[1fr_auto_auto_auto] items-center px-4 h-12 bg-muted/20 border-b border-border gap-4">
                <div className="text-sm text-muted-foreground">App</div>
                <div className="text-sm text-muted-foreground">Type</div>
                <div className="text-sm text-muted-foreground">Created</div>
                <div className="text-sm text-muted-foreground pr-2">Actions</div>
              </div>
              <ul>
                {clients.map((client, i) => (
                  <li
                    key={client.client_id}
                    className={cn(
                      "grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-3 gap-4",
                      i !== 0 && "border-t border-border",
                      client.disabled && "opacity-50",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {client.client_name ?? "Unnamed App"}
                      </div>
                      <code className="text-xs text-muted-foreground font-mono mt-0.5 block truncate">
                        {client.client_id}
                      </code>
                    </div>
                    <div>
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded",
                          client.public
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {client.public ? "Public" : "Confidential"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                      {client.client_id_issued_at
                        ? formatDate(new Date(client.client_id_issued_at * 1000))
                        : "—"}
                    </div>
                    <div className="flex items-center gap-1">
                      {!client.public && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Rotate the secret for "${client.client_name ?? client.client_id}"?\n\nThis will immediately invalidate the current secret. All integrations using it will stop working until updated.`,
                              )
                            ) {
                              rotateSecret(client.client_id);
                            }
                          }}
                          disabled={rotating || deleting}
                          title="Rotate secret"
                          className="p-2 rounded-md hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <RefreshCw size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete "${client.client_name ?? client.client_id}"?\n\nThis will revoke all active tokens for every user who authorized this app. This cannot be undone.`,
                            )
                          ) {
                            deleteClient(client.client_id);
                          }
                        }}
                        disabled={deleting || rotating}
                        title="Delete app"
                        className="p-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* How it works guide */}
        <section className="rounded-lg border border-border bg-muted/10 p-6 space-y-3">
          <h3 className="text-sm font-semibold">OAuth 2.1 Flow</h3>
          <p className="text-sm text-muted-foreground">
            Use your app credentials to let external services authenticate users via Feeduro.
          </p>
          <div className="space-y-1">
            {[
              ["Authorization URL", "/api/auth/oauth2/authorize"],
              ["Token URL", "/api/auth/oauth2/token"],
              ["UserInfo URL", "/api/auth/oauth2/userinfo"],
              ["Discovery", "/api/auth/.well-known/openid-configuration"],
            ].map(([label, path]) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span className="w-36 text-muted-foreground shrink-0">{label}</span>
                <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{path}</code>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

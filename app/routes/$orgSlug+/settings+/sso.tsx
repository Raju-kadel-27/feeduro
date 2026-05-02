import { AppSidebar } from "@components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { requireOrgBySlug } from "@lib/session.server";
import { cn } from "@lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getBaseUrl } from "@utils/base-url";
import { and, eq } from "drizzle-orm";
import { Check, Copy, KeyRound, Plus, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { getDb } from "@/db";
import { member, ssoProvider } from "@/db/schema";
import type { Route } from "./+types/sso";

export function meta() {
  return [{ title: "Login & SSO — Feediyo" }];
}

interface SSOProvider {
  id: string;
  issuer: string;
  domain: string | null;
  providerId: string | null;
  type: "oidc" | "saml";
  clientId: string | null;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const [providers, memberRecord] = await Promise.all([
    db.query.ssoProvider.findMany({
      where: eq(ssoProvider.organizationId, organizationId),
      columns: { id: true, issuer: true, domain: true, providerId: true, oidcConfig: true },
    }),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
    }),
  ]);

  return {
    isAdmin: memberRecord?.role === "admin",
    baseUrl: getBaseUrl(),
    providers: providers.map((p) => {
      let clientId: string | null = null;
      if (p.oidcConfig) {
        try {
          const cfg = JSON.parse(p.oidcConfig) as { clientId?: string };
          clientId = cfg.clientId ?? null;
        } catch {}
      }
      return {
        id: p.id,
        issuer: p.issuer,
        domain: p.domain,
        providerId: p.providerId,
        type: (p.oidcConfig ? "oidc" : "saml") as "oidc" | "saml",
        clientId,
      } satisfies SSOProvider;
    }),
  };
}

function CopyButton({ value }: { value: string }) {
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
      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export default function SSOSettings({ loaderData }: Route.ComponentProps) {
  const { providers, isAdmin, baseUrl } = loaderData;
  const revalidator = useRevalidator();
  const _queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [issuer, setIssuer] = useState("");
  const [domain, setDomain] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  const callbackUrl = providerId.trim()
    ? `${baseUrl}/api/auth/sso/callback/${providerId.trim()}`
    : `${baseUrl}/api/auth/sso/callback/{provider-id}`;

  async function callApi(body: object) {
    const res = await fetch("/api/sso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(json.error ?? "Request failed");
    return json;
  }

  const { mutate: registerProvider, isPending: registering } = useMutation({
    mutationFn: () =>
      callApi({ intent: "register", providerId, issuer, domain, clientId, clientSecret }),
    onSuccess: () => {
      toast.success("SSO provider configured");
      setShowForm(false);
      setProviderId("");
      setIssuer("");
      setDomain("");
      setClientId("");
      setClientSecret("");
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: deleteProvider, isPending: deleting } = useMutation({
    mutationFn: (id: string) => callApi({ intent: "delete", id }),
    onSuccess: () => {
      toast.success("SSO provider removed");
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Login & SSO</span>
        </header>

        <main className="p-6 max-w-[640px] mx-auto w-full space-y-8">
          <div>
            <h2 className="text-[13px] font-semibold text-foreground">Single Sign-On</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Allow workspace members to sign in with your identity provider via OIDC or SAML.
            </p>
          </div>

          {/* Existing providers */}
          <section>
            <h3 className="text-[13px] font-semibold text-foreground mb-2">Configured Providers</h3>

            {providers.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-8 text-center">
                <Shield size={20} className="mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">No SSO provider configured yet.</p>
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden bg-card">
                <div className="grid grid-cols-[1fr_auto] items-center px-3 h-9 bg-muted/30 border-b border-border">
                  <div className="text-xs text-muted-foreground">Provider</div>
                  <div className="text-xs text-muted-foreground pr-8">Type</div>
                </div>
                <ul>
                  {providers.map((p, i) => (
                    <li
                      key={p.id}
                      className={cn(
                        "grid grid-cols-[1fr_auto] items-center px-3 h-[52px]",
                        i !== 0 && "border-t border-border",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground truncate">
                            {p.domain ?? p.issuer}
                          </span>
                          <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-primary/10 text-primary uppercase shrink-0">
                            {p.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {p.issuer}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => deleteProvider(p.id)}
                            disabled={deleting}
                            title="Remove provider"
                            className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isAdmin && !showForm && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Plus size={12} />
                  <span>Add Provider</span>
                </button>
              </div>
            )}
          </section>

          {/* Add provider form */}
          {isAdmin && showForm && (
            <section>
              <h3 className="text-[13px] font-semibold text-foreground mb-3">
                Configure OIDC Provider
              </h3>

              {/* Callback URL */}
              <div className="mb-4 rounded-md border border-border bg-muted/20 px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground mb-1">
                  Register this redirect URI with your identity provider:
                </p>
                <div className="flex items-center gap-1.5">
                  <code className="text-[11px] text-foreground font-mono break-all">
                    {callbackUrl}
                  </code>
                  <CopyButton value={callbackUrl} />
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  registerProvider();
                }}
                className="rounded-md border border-border p-4 space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Provider ID</label>
                    <input
                      type="text"
                      value={providerId}
                      onChange={(e) =>
                        setProviderId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                      }
                      placeholder="e.g. acme-corp"
                      required
                      className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Unique slug, used in the callback URL
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Domain</label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="e.g. yourcompany.com"
                      required
                      className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Users with this email domain
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Issuer URL</label>
                  <input
                    type="url"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    placeholder="https://your-org.okta.com"
                    required
                    className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    OIDC discovery is fetched automatically from{" "}
                    <span className="font-mono">{"{issuer}/.well-known/openid-configuration"}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Client ID</label>
                    <input
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="Client ID from your IdP"
                      required
                      className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Client Secret</label>
                    <input
                      type="password"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      placeholder="Client secret from your IdP"
                      required
                      className="w-full px-3 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={
                      registering || !providerId || !issuer || !domain || !clientId || !clientSecret
                    }
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {registering ? "Saving…" : "Save Provider"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted/50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* Sign in via SSO info */}
          <section className="rounded-md border border-border bg-muted/10 px-4 py-3 space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound size={13} className="text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">SSO sign-in endpoint</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Users can sign in with SSO from the login page by entering their work email. They will
              be redirected to your identity provider automatically.
            </p>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

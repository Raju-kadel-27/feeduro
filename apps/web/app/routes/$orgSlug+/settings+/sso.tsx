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
      className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors bg-muted/10 hover:bg-muted/20"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}

export default function SSOSettings({ loaderData }: Route.ComponentProps) {
  const { providers, isAdmin, baseUrl } = loaderData;
  const revalidator = useRevalidator();
  const _queryClient = useQueryClient();

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

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold">Single Sign-On</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Allow workspace members to sign in with your identity provider via OIDC or SAML.
              </p>
            </div>
            {isAdmin && (
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[15px] font-semibold bg-foreground text-background hover:bg-foreground/90 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Plus size={16} />
                    Add Provider
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configure OIDC Provider</DialogTitle>
                  </DialogHeader>
                  <div className="mb-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
                    <p className="text-sm text-muted-foreground mb-2">
                      Register this redirect URI with your identity provider:
                    </p>
                    <div className="flex items-center gap-3">
                      <code className="text-sm text-foreground font-mono break-all flex-1">
                        {callbackUrl}
                      </code>
                      <CopyButton value={callbackUrl} />
                    </div>
                  </div>
                  <form
                    onSubmit={(e) => { e.preventDefault(); registerProvider(); }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Provider ID</label>
                        <input
                          type="text"
                          value={providerId}
                          onChange={(e) => setProviderId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                          placeholder="e.g. acme-corp"
                          required
                          className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <p className="text-xs text-muted-foreground">Unique slug, used in the callback URL</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Domain</label>
                        <input
                          type="text"
                          value={domain}
                          onChange={(e) => setDomain(e.target.value)}
                          placeholder="e.g. yourcompany.com"
                          required
                          className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <p className="text-xs text-muted-foreground">Users with this email domain</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Issuer URL</label>
                      <input
                        type="url"
                        value={issuer}
                        onChange={(e) => setIssuer(e.target.value)}
                        placeholder="https://your-org.okta.com"
                        required
                        className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <p className="text-xs text-muted-foreground">
                        OIDC discovery fetched from{" "}
                        <span className="font-mono">{"{issuer}/.well-known/openid-configuration"}</span>
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Client ID</label>
                        <input
                          type="text"
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          placeholder="Client ID from your IdP"
                          required
                          className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Client Secret</label>
                        <input
                          type="password"
                          value={clientSecret}
                          onChange={(e) => setClientSecret(e.target.value)}
                          placeholder="Client secret from your IdP"
                          required
                          className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={registering || !providerId || !issuer || !domain || !clientId || !clientSecret}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {registering ? "Saving…" : "Save Provider"}
                      </button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Existing providers */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">Configured Providers</h3>

            {providers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center bg-muted/10">
                <Shield size={24} className="mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No SSO provider configured yet.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden bg-card">
                <div className="grid grid-cols-[1fr_auto] items-center px-4 h-12 bg-muted/20 border-b border-border">
                  <div className="text-sm text-muted-foreground">Provider</div>
                  <div className="text-sm text-muted-foreground pr-8">Type</div>
                </div>
                <ul>
                  {providers.map((p, i) => (
                    <li
                      key={p.id}
                      className={cn(
                        "grid grid-cols-[1fr_auto] items-center px-4 py-3",
                        i !== 0 && "border-t border-border",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {p.domain ?? p.issuer}
                          </span>
                          <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary uppercase shrink-0">
                            {p.type}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">{p.issuer}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => deleteProvider(p.id)}
                            disabled={deleting}
                            title="Remove provider"
                            className="p-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground disabled:opacity-50"
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

          </section>

          {/* Sign in via SSO info */}
          <section className="rounded-lg border border-border bg-muted/10 px-6 py-4 space-y-2">
            <div className="flex items-center gap-2">
              <KeyRound size={15} className="text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold text-foreground">SSO sign-in endpoint</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Users can sign in with SSO from the login page by entering their work email. They will
              be redirected to your identity provider automatically.
            </p>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

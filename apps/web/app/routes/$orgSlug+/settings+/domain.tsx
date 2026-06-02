import { SidebarTrigger } from "@components/ui/sidebar";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { useMutation } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { AlertCircle, CheckCircle2, Clock, Copy, Globe, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { getDb } from "@/db";
import { customDomains, member } from "@/db/schema";

import type { Route } from "./+types/domain";

export function meta() {
  return [{ title: "Domain Settings — Feediyo" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, organizationId } = await requireOrgBySlug(request, params.orgSlug);
  const db = getDb();

  const [domain, memberRecord] = await Promise.all([
    db.query.customDomains.findFirst({
      where: eq(customDomains.organizationId, organizationId),
    }),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
    }),
  ]);

  return {
    domain: domain ?? null,
    isAdmin: memberRecord?.role === "admin",
  };
}

type DomainRecord = {
  id: string;
  domain: string;
  status: "pending" | "active" | "failed";
  verifiedAt: Date | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  active: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  failed: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

const STATUS_ICON = {
  pending: Clock,
  active: CheckCircle2,
  failed: AlertCircle,
};

export default function DomainSettings({ loaderData }: Route.ComponentProps) {
  const { domain: initialDomain, isAdmin } = loaderData;
  const domain = initialDomain as DomainRecord | null;
  const revalidator = useRevalidator();

  const [domainInput, setDomainInput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  async function callApi(body: object) {
    const res = await fetch("/api/domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { error?: string; verified?: boolean };
    if (!res.ok) throw new Error(json.error ?? "Request failed");
    return json;
  }

  const {
    mutate: addDomain,
    isPending: adding,
    error: addError,
  } = useMutation({
    mutationFn: () => callApi({ intent: "add_domain", domain: domainInput }),
    onSuccess: () => {
      setDomainInput("");
      revalidator.revalidate();
    },
  });

  const { mutate: removeDomain, isPending: removing } = useMutation({
    mutationFn: () => callApi({ intent: "remove_domain" }),
    onSuccess: () => revalidator.revalidate(),
  });

  const { mutate: verifyDomain, isPending: verifying } = useMutation({
    mutationFn: () => callApi({ intent: "verify_domain" }),
    onSuccess: (result) => {
      if (!result.verified) {
        setVerifyError((result as { error?: string }).error ?? "Verification failed");
      } else {
        setVerifyError(null);
      }
      revalidator.revalidate();
    },
  });

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const StatusIcon = domain ? STATUS_ICON[domain.status] : null;
  const showDnsInstructions = domain && (domain.status === "pending" || domain.status === "failed");

  return (
        <>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <span className="text-sm font-medium">Domain</span>
        </header>

        <main className="p-6 max-w-[840px] mx-auto w-full space-y-10">
          <div>
            <h1 className="text-xl font-semibold">Domain</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure your custom domain and DNS settings.
            </p>
          </div>

          <section>
            <h2 className="text-base font-semibold mb-1">Custom Domain</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Point a custom domain to this workspace so your users see your brand, not ours.
            </p>

            {!domain ? (
              isAdmin ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addDomain();
                  }}
                  className="flex gap-2 items-end"
                >
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Domain</label>
                    <input
                      type="text"
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="feedback.company.com"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={adding || !domainInput.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {adding ? "Adding…" : "Add Domain"}
                  </button>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">No custom domain configured.</p>
              )
            ) : (
              <div className="space-y-4">
                {/* Domain row */}
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{domain.domain}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[domain.status]}`}
                    >
                      {StatusIcon && <StatusIcon className="h-3 w-3" />}
                      {domain.status.charAt(0).toUpperCase() + domain.status.slice(1)}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => removeDomain()}
                        disabled={removing}
                        title="Remove domain"
                        className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* DNS configuration instructions */}
                {showDnsInstructions && (
                  <div className="rounded-lg border p-4 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-1">Configure DNS</h3>
                      <p className="text-xs text-muted-foreground">
                        Add this CNAME record at your DNS provider, then click Verify. Changes can
                        take up to 48 hours to propagate.
                      </p>
                    </div>

                    {/* CNAME record */}
                    <div className="rounded-md bg-muted/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">CNAME record</span>
                        <button
                          type="button"
                          onClick={() => copy("cname.feediyo.com", "cname")}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                          {copied === "cname" ? "Copied!" : "Copy value"}
                        </button>
                      </div>
                      <div className="grid grid-cols-[56px_1fr] gap-x-3 gap-y-1 text-xs font-mono">
                        <span className="text-muted-foreground font-sans">Name</span>
                        <span className="break-all">{domain.domain}</span>
                        <span className="text-muted-foreground font-sans">Value</span>
                        <span className="break-all">cname.feediyo.com</span>
                      </div>
                    </div>

                    {verifyError && <p className="text-xs text-destructive">{verifyError}</p>}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setVerifyError(null);
                          verifyDomain();
                        }}
                        disabled={verifying}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${verifying ? "animate-spin" : ""}`} />
                        {verifying ? "Checking DNS…" : "Verify DNS"}
                      </button>
                    )}
                  </div>
                )}

                {/* Active state */}
                {domain.status === "active" && (
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 px-4 py-3">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your custom domain is active. Traffic to <strong>{domain.domain}</strong> is
                      routing to this workspace.
                    </p>
                  </div>
                )}
              </div>
            )}

            {addError && (
              <p className="mt-2 text-sm text-destructive">{(addError as Error).message}</p>
            )}
          </section>
        </main>
        </>
  );
}

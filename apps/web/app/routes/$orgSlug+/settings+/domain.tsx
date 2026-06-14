import { PageTitle } from "@components/common/page-title";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { useMutation } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { AlertCircle, Check, CheckCircle2, Clock, Copy, Globe, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRevalidator } from "react-router";
import { getDb } from "@/db";
import { customDomains, member } from "@/db/schema";

import type { Route } from "./+types/domain";

export function meta() {
  return [{ title: "Domain Settings — Feeduro" }];
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

const STATUS_ICON = { pending: Clock, active: CheckCircle2, failed: AlertCircle };

const DOMAIN_RE = /^(?!https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
const APEX_RE = /^[^.]+\.[^.]+$/;

function validateDomain(val: string): string | null {
  if (val.startsWith("http")) return "Enter the domain only, without https://";
  if (!DOMAIN_RE.test(val)) return "Enter a valid domain like feedback.company.com";
  if (APEX_RE.test(val)) return "Apex domains need CNAME flattening — use a subdomain (e.g. feedback.company.com) if unsure";
  return null;
}

async function callDomainApi(body: object): Promise<{ error?: string; verified?: boolean }> {
  const res = await fetch("/api/domain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { error?: string; verified?: boolean };
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

export default function DomainSettings({ loaderData }: Route.ComponentProps) {
  const { domain: initialDomain, isAdmin } = loaderData;
  const domain = initialDomain as DomainRecord | null;
  const revalidator = useRevalidator();

  const [domainInput, setDomainInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Background-poll while pending: checks DNS every 30s and revalidates the loader only on success.
  // Uses auto:true so the server never writes "failed" — it only transitions pending→active silently.
  useEffect(() => {
    if (domain?.status !== "pending") return;
    const id = setInterval(async () => {
      try {
        const result = await callDomainApi({ intent: "verify_domain", auto: true });
        if (result.verified) revalidator.revalidate();
      } catch {
        // silent — network errors during polling are non-fatal
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [domain?.status, revalidator]);

  const { mutate: addDomain, isPending: adding, error: addError } = useMutation({
    mutationFn: () => callDomainApi({ intent: "add_domain", domain: domainInput }),
    onSuccess: () => { setDomainInput(""); revalidator.revalidate(); },
  });

  const { mutate: removeDomain, isPending: removing } = useMutation({
    mutationFn: () => callDomainApi({ intent: "remove_domain" }),
    onSuccess: () => { setConfirmRemove(false); revalidator.revalidate(); },
  });

  const { mutate: verifyDomain, isPending: verifying } = useMutation({
    mutationFn: () => callDomainApi({ intent: "verify_domain" }),
    onSuccess: (result) => {
      setVerifyError(!result.verified ? (result.error ?? "Verification failed") : null);
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
  const isApex = domain ? APEX_RE.test(domain.domain) : false;

  return (
    <>
      <PageTitle title="Domain" />

      <main className="p-6 max-w-[840px] mx-auto w-full space-y-10">

        <section>
          <h2 className="text-base font-semibold mb-1">Custom Domain</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Point a custom domain to this workspace so your users see your brand, not ours.
          </p>

          {!domain ? (
            isAdmin ? (
              <form
                onSubmit={(e) => { e.preventDefault(); if (!inputError) addDomain(); }}
                className="flex flex-wrap gap-2 items-end"
              >
                <div className="flex-1 min-w-[220px] space-y-1">
                  <label htmlFor="domain-input" className="text-xs font-medium text-muted-foreground">
                    Domain
                  </label>
                  <input
                    id="domain-input"
                    type="text"
                    value={domainInput}
                    onChange={(e) => {
                      setDomainInput(e.target.value);
                      setInputError(e.target.value.trim() ? validateDomain(e.target.value) : null);
                    }}
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="feedback.company.com"
                    required
                  />
                  {inputError && <p className="text-xs text-destructive">{inputError}</p>}
                </div>
                <button
                  type="submit"
                  disabled={adding || !domainInput.trim() || !!inputError}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {adding ? "Adding…" : "Add Domain"}
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <Globe className="h-8 w-8 opacity-30" />
                <p className="text-sm font-medium">No custom domain configured</p>
                <p className="text-xs">Ask a workspace admin to set this up.</p>
              </div>
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
                  {domain.status === "pending" && (
                    <span className="text-xs text-muted-foreground animate-pulse">Checking…</span>
                  )}
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[domain.status]}`}>
                    {StatusIcon && <StatusIcon className="h-3 w-3" />}
                    {domain.status.charAt(0).toUpperCase() + domain.status.slice(1)}
                  </span>
                  {isAdmin && !confirmRemove && (
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(true)}
                      aria-label="Remove domain"
                      className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Inline remove confirmation */}
              {confirmRemove && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 flex items-center justify-between gap-4">
                  <p className="text-sm text-destructive">
                    Remove <strong>{domain.domain}</strong>? This will break live traffic immediately.
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(false)}
                      className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDomain()}
                      disabled={removing}
                      className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                    >
                      {removing ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </div>
              )}

              {/* DNS configuration instructions */}
              {showDnsInstructions && (
                <div className="rounded-lg border p-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Configure DNS</h3>
                    <p className="text-xs text-muted-foreground">
                      Add the DNS record below. Usually takes 5–30 minutes; up to 48 hours in rare cases.{" "}
                      <a
                        href={`https://dnschecker.org/#CNAME/${domain.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground transition-colors"
                      >
                        Check propagation ↗
                      </a>
                    </p>
                  </div>

                  <Tabs defaultValue={isApex ? "apex" : "cname"}>
                    <TabsList className="h-8">
                      <TabsTrigger value="cname" className="text-xs px-3 py-1">Subdomain (CNAME)</TabsTrigger>
                      <TabsTrigger value="apex" className="text-xs px-3 py-1">Apex domain</TabsTrigger>
                    </TabsList>

                    <TabsContent value="cname">
                      <div className="rounded-md bg-muted/50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">CNAME record</span>
                          <button
                            type="button"
                            onClick={() => copy("cname.feeduro.com", "cname")}
                            aria-label="Copy CNAME value"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-[72px] justify-end"
                          >
                            {copied === "cname" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            {copied === "cname" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <div className="grid grid-cols-[56px_1fr] gap-x-3 gap-y-1 text-xs font-mono">
                          <span className="text-muted-foreground font-sans">Name</span>
                          <span className="break-all">{domain.domain}</span>
                          <span className="text-muted-foreground font-sans">Value</span>
                          <span className="break-all">cname.feeduro.com</span>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="apex">
                      <div className="rounded-md bg-muted/50 p-3 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Cloudflare, Route 53, and Netlify DNS support CNAME flattening or ALIAS records on apex domains.
                          Use the same target value but set the type to <strong>ALIAS</strong> or <strong>ANAME</strong>.
                        </p>
                        <div className="grid grid-cols-[56px_1fr] gap-x-3 gap-y-1 text-xs font-mono">
                          <span className="text-muted-foreground font-sans">Name</span>
                          <span className="break-all">@ (or leave blank)</span>
                          <span className="text-muted-foreground font-sans">Value</span>
                          <span className="break-all">cname.feeduro.com</span>
                          <span className="text-muted-foreground font-sans">Type</span>
                          <span>ALIAS / ANAME</span>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {verifyError && (
                    <p className="text-xs text-destructive" role="alert">{verifyError}</p>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => { setVerifyError(null); verifyDomain(); }}
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
                    Your custom domain is active. Traffic to <strong>{domain.domain}</strong> is routing to this workspace.
                  </p>
                </div>
              )}
            </div>
          )}

          {addError && (
            <p className="mt-2 text-sm text-destructive" role="alert">{(addError as Error).message}</p>
          )}
        </section>
      </main>
    </>
  );
}

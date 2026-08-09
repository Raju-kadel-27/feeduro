import { PageHeader } from "@components/common/page-header";
import { RouteErrorMessage } from "@components/common/route-error";
import { SettingsContentSkeleton } from "@components/common/settings-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { requireOrgBySlug } from "@features/auth/server/guards";
import { PlanBanner } from "@features/internal/billing/components/plan-banner";
import { getOrgPlanLimits } from "@features/internal/billing/server/plan-limits";
import { useMutation } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { AlertCircle, Check, CheckCircle2, Clock, Copy, Globe, RefreshCw, Star, Trash2 } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Await, Link, useParams, useRevalidator } from "react-router";
import { customDomains, member } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/domain";

export function meta() {
  return [{ title: "Domain Settings — Feeduro" }];
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

type DomainData = { planLocked: true } | { domain: DomainRecord | null; isAdmin: boolean };

export function shouldRevalidate() {
  return false;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const dataPromise: Promise<DomainData> = Promise.all([
    db.query.customDomains.findFirst({
      where: eq(customDomains.organizationId, organizationId),
      columns: { id: true, domain: true, status: true, verifiedAt: true },
    }),
    db.query.member.findFirst({
      where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
      columns: { role: true },
    }),
    getOrgPlanLimits(db, organizationId),
  ]).then(([domain, memberRecord, planLimits]) => {
    if (!planLimits.customDomain) return { planLocked: true as const };
    return { domain: (domain ?? null) as DomainRecord | null, isAdmin: memberRecord?.role === "admin" };
  });

  return { dataPromise };
}

export function ErrorBoundary() {
  return <RouteErrorMessage resource="domain settings" />;
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
  const { orgSlug } = useParams<{ orgSlug: string }>();

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
      </header>
      <Suspense fallback={<SettingsContentSkeleton />}>
        <Await
          resolve={loaderData.dataPromise as unknown as Promise<DomainData>}
          errorElement={<RouteErrorMessage resource="domain settings" />}
        >
          {(pageData) => {
            if ("planLocked" in pageData) {
              return (
                <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
                  <PageHeader
                    title="Custom Domain"
                    description="Point a custom domain to this workspace so your users see your brand, not ours."
                    icon={Globe}
                  />
                  <PlanBanner>
                    Custom domains are available on the <span className="font-semibold">Professional</span> plan.
                  </PlanBanner>
                  <section className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[220px] space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Domain</label>
                      <input
                        type="text"
                        disabled
                        className="w-full px-3 py-2 rounded-md border bg-muted text-sm opacity-50 cursor-not-allowed"
                        placeholder="feedback.company.com"
                      />
                    </div>
                    <Link
                      to={`/${orgSlug}/settings/billing`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
                    >
                      Upgrade
                      <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden="true" />
                    </Link>
                  </section>
                </main>
              );
            }
            return <DomainContent domain={pageData.domain} isAdmin={pageData.isAdmin} />;
          }}
        </Await>
      </Suspense>
    </>
  );
}

function DomainContent({ domain: initialDomain, isAdmin }: { domain: DomainRecord | null; isAdmin: boolean }) {
  const domain = initialDomain;
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
    <main className="p-6 max-w-[840px] mx-auto w-full space-y-8">
      <PageHeader
        title="Custom Domain"
        description="Point a custom domain to this workspace so your users see your brand, not ours."
          icon={Globe}
        />

        <section>

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
                    <h3 className="text-base font-semibold mb-1">Configure DNS</h3>
                    <p className="text-sm text-muted-foreground">
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
                      <TabsTrigger value="cname" className="text-sm px-3 py-1">Subdomain (CNAME)</TabsTrigger>
                      <TabsTrigger value="apex" className="text-sm px-3 py-1">Apex domain</TabsTrigger>
                    </TabsList>

                    <TabsContent value="cname">
                      <div className="rounded-md bg-muted/50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">CNAME record</span>
                          <button
                            type="button"
                            onClick={() => copy("cname.feeduro.com", "cname")}
                            aria-label="Copy CNAME value"
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-[80px] justify-end"
                          >
                            {copied === "cname" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied === "cname" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <div className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1 text-sm font-mono">
                          <span className="text-muted-foreground font-sans">Name</span>
                          <span className="break-all">{domain.domain}</span>
                          <span className="text-muted-foreground font-sans">Value</span>
                          <span className="break-all">cname.feeduro.com</span>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="apex">
                      <div className="rounded-md bg-muted/50 p-3 space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Cloudflare, Route 53, and Netlify DNS support CNAME flattening or ALIAS records on apex domains.
                          Use the same target value but set the type to <strong>ALIAS</strong> or <strong>ANAME</strong>.
                        </p>
                        <div className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1 text-sm font-mono">
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
                    <p className="text-sm text-destructive" role="alert">{verifyError}</p>
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
  );
}

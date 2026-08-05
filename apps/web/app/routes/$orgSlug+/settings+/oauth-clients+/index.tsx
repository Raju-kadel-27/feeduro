import { AdminOnlyWall } from "@components/common/admin-only-wall";
import { PageHeader } from "@components/common/page-header";
import { requireOrgBySlug } from "@features/auth/server/guards";
import {
  ClientsTable,
  type OAuthClientRow,
} from "@features/oauth-clients/components/clients-table";
import { CopyButton } from "@features/oauth-clients/components/copy-button";
import { DeleteAppDialog } from "@features/oauth-clients/components/delete-app-dialog";
import { RotateConfirmDialog } from "@features/oauth-clients/components/rotate-confirm-dialog";
import { useMutation } from "@tanstack/react-query";
import { and, count, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { AppWindow, Download } from "lucide-react";
import { useState } from "react";
import { useNavigate, useRevalidator } from "react-router";
import { toast } from "sonner";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { member, oauthAccessToken, oauthClient } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/index";

export function meta() {
  return [{ title: "OAuth Apps — Feeduro" }];
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value !== "string" || !value) return [];
  if (value.startsWith("{") && value.endsWith("}")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((s) => s.replace(/^"|"$/g, "").trim())
      .filter(Boolean);
  }
  try {
    return JSON.parse(value) as string[];
  } catch {}
  return [value];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { session, organizationId } = await requireOrgBySlug(db, request, params.orgSlug);

  const appOrigin = new URL(request.url).origin;

  const memberRecord = await db.query.member.findFirst({
    where: and(eq(member.organizationId, organizationId), eq(member.userId, session.user.id)),
    columns: { role: true },
  });

  if (memberRecord?.role !== "admin") {
    return { adminLocked: true as const, clients: [] as OAuthClientRow[], appOrigin };
  }

  const rawClients = await db
    .select({
      client_id: oauthClient.clientId,
      client_name: oauthClient.name,
      redirect_uris: oauthClient.redirectUris,
      token_endpoint_auth_method: oauthClient.tokenEndpointAuthMethod,
      client_id_issued_at: oauthClient.createdAt,
      disabled: oauthClient.disabled,
      public: oauthClient.public,
      icon: oauthClient.icon,
    })
    .from(oauthClient)
    .where(eq(oauthClient.referenceId, organizationId));

  const clients = rawClients.map((c) => ({
    ...c,
    client_id_issued_at: c.client_id_issued_at
      ? Math.floor(new Date(c.client_id_issued_at).getTime() / 1000)
      : undefined,
    redirect_uris: toStringArray(c.redirect_uris),
  }));

  if (clients.length === 0) return { adminLocked: false as const, clients: [] as OAuthClientRow[], appOrigin };

  const clientIds = clients.map((c) => c.client_id);

  const tokenCounts = await db
    .select({ clientId: oauthAccessToken.clientId, total: count() })
    .from(oauthAccessToken)
    .where(
      and(
        inArray(oauthAccessToken.clientId, clientIds),
        or(isNull(oauthAccessToken.expiresAt), gt(oauthAccessToken.expiresAt, new Date())),
      ),
    )
    .groupBy(oauthAccessToken.clientId);

  const countMap = Object.fromEntries(tokenCounts.map((r) => [r.clientId, r.total]));
  return {
    adminLocked: false as const,
    clients: clients.map((c) => ({ ...c, activeTokens: countMap[c.client_id] ?? 0 })),
    appOrigin,
  };
}

export function shouldRevalidate() {
  return false;
}

export function ErrorBoundary() {
  return (
    <div className="p-6 text-sm text-destructive">
      Failed to load OAuth apps. Please refresh and try again.
    </div>
  );
}

const OAUTH_ENDPOINTS = [
  ["Authorization URL", "/api/auth/oauth2/authorize"],
  ["Token URL", "/api/auth/oauth2/token"],
  ["UserInfo URL", "/api/auth/oauth2/userinfo"],
  ["Discovery", "/api/auth/.well-known/openid-configuration"],
] as const;

function downloadEndpoints(appOrigin: string) {
  const endpoints = Object.fromEntries(
    OAUTH_ENDPOINTS.map(([label, path]) => [label, `${appOrigin}${path}`]),
  );
  const blob = new Blob([JSON.stringify(endpoints, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "oauth-endpoints.json";
  a.click();
  URL.revokeObjectURL(url);
}

export default function OAuthClientsSettings({ loaderData }: Route.ComponentProps) {
  const { clients, appOrigin, adminLocked } = loaderData as {
    clients: OAuthClientRow[];
    appOrigin: string;
    adminLocked: boolean;
  };
  const revalidator = useRevalidator();
  const navigate = useNavigate();

  type DialogTarget = { clientId: string; clientName?: string; activeTokens: number };

  const [deleteTarget, setDeleteTarget] = useState<DialogTarget | null>(null);
  const [rotateTarget, setRotateTarget] = useState<DialogTarget | null>(null);

  async function callAction(body: object) {
    const res = await fetch("/api/oauth-clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok || json.error) throw new Error((json.error as string) ?? "Request failed");
    return json;
  }

  const { mutate: deleteClient, isPending: deleting } = useMutation({
    mutationFn: (clientId: string) => callAction({ intent: "delete", clientId }),
    onSuccess: () => {
      toast.success("OAuth app deleted");
      setDeleteTarget(null);
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: rotateSecret, isPending: rotating } = useMutation({
    mutationFn: (clientId: string) => callAction({ intent: "rotate", clientId }),
    onSuccess: (result, clientId) => {
      const secret = result.secret as string | null;
      setRotateTarget(null);
      if (secret) {
        navigate(clientId, { relative: "path", state: { newSecret: secret } });
      } else {
        revalidator.revalidate();
        toast.success("Secret rotated");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteClient(deleteTarget.clientId);
  }

  function handleRotateConfirm() {
    if (!rotateTarget) return;
    rotateSecret(rotateTarget.clientId);
  }

  if (adminLocked) {
    return (
      <>
        <header className="flex h-14 shrink-0 items-center px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="p-6 max-w-[975px] mx-auto w-full space-y-8">
          <PageHeader title="OAuth Apps" icon={AppWindow} description="Register apps that authenticate users via your workspace." />
          <AdminOnlyWall message="Only workspace admins can manage OAuth apps." />
        </main>
      </>
    );
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>

      <main className="p-6 max-w-[975px] mx-auto w-full space-y-8">
        <PageHeader
          title="OAuth Apps"
          icon={AppWindow}
          description="Register apps that authenticate users via your workspace."
          action={
            <button
              type="button"
              onClick={() => navigate("new", { relative: "path" })}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Register an app
            </button>
          }
        />

        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">Registered Apps</h3>
          <ClientsTable
            clients={clients}
            appOrigin={appOrigin}
            onRowClick={(client) => navigate(client.client_id, { relative: "path" })}
            onEdit={(client) => navigate(`${client.client_id}/edit`, { relative: "path" })}
            onCreateClick={() => navigate("new", { relative: "path" })}
            onRotate={(c) =>
              setRotateTarget({
                clientId: c.client_id,
                clientName: c.client_name,
                activeTokens: c.activeTokens,
              })
            }
            onDelete={(c) =>
              setDeleteTarget({
                clientId: c.client_id,
                clientName: c.client_name,
                activeTokens: c.activeTokens,
              })
            }
          />
        </section>

        <section className="rounded-lg border border-border bg-muted/10 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[15px] font-semibold">OAuth 2.1 Endpoints</h3>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Use these URLs to configure your OAuth client.
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadEndpoints(appOrigin)}
              className="shrink-0 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md border border-border hover:bg-muted/50 transition-colors"
            >
              <Download size={12} />
              Download
            </button>
          </div>
          <div className="space-y-2">
            {OAUTH_ENDPOINTS.map(([label, path]) => {
              const fullUrl = `${appOrigin}${path}`;
              return (
                <div key={label} className="flex items-start gap-3">
                  <span className="w-32 shrink-0 text-muted-foreground text-[14.5px] pt-1.5">
                    {label}
                  </span>
                  <div className="flex items-start gap-1 flex-1 min-w-0">
                    <code className="font-mono text-[12px] bg-muted px-2 py-1.5 rounded flex-1 break-all leading-relaxed">
                      {fullUrl}
                    </code>
                    <CopyButton
                      value={fullUrl}
                      label={label}
                      iconSize={16}
                      className="p-1.5 shrink-0 mt-0.5"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <DeleteAppDialog
        open={deleteTarget !== null}
        appName={deleteTarget?.clientName ?? deleteTarget?.clientId ?? ""}
        activeTokens={deleteTarget?.activeTokens ?? 0}
        deleting={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <RotateConfirmDialog
        open={rotateTarget !== null}
        appName={rotateTarget?.clientName ?? rotateTarget?.clientId ?? ""}
        activeTokens={rotateTarget?.activeTokens ?? 0}
        rotating={rotating}
        onConfirm={handleRotateConfirm}
        onCancel={() => setRotateTarget(null)}
      />
    </>
  );
}

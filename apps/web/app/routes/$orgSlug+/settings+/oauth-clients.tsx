import { PageHeader } from "@components/common/page-header";
import { requireOrgBySlug } from "@features/auth/server/guards";
import {
  ClientsTable,
  type OAuthClientRow,
} from "@features/oauth-clients/components/clients-table";
import {
  type ConfirmAction,
  ConfirmActionDialog,
} from "@features/oauth-clients/components/confirm-action-dialog";
import { CopyButton } from "@features/oauth-clients/components/copy-button";
import {
  type CreateClientData,
  CreateClientDialog,
} from "@features/oauth-clients/components/create-client-dialog";
import {
  NewCredentialsReveal,
  RotatedSecretReveal,
} from "@features/oauth-clients/components/credentials-reveal";
import { useMutation } from "@tanstack/react-query";
import { and, count, gt, inArray, isNull, or } from "drizzle-orm";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { auth } from "@/app/lib/auth/server";
import { getDb } from "@/db";
import { oauthAccessToken } from "@/db/schema";

import type { Route } from "./+types/oauth-clients";

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

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireOrgBySlug(request, params.orgSlug);

  const appOrigin = new URL(request.url).origin;
  const result = await auth.api.getOAuthClients({ headers: request.headers });
  const raw = (result ?? []) as Omit<OAuthClientRow, "activeTokens">[];
  const clients = raw.map((c) => ({ ...c, redirect_uris: toStringArray(c.redirect_uris) }));

  if (clients.length === 0) return { clients: [] as OAuthClientRow[], appOrigin };

  const db = getDb();
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
    clients: clients.map((c) => ({ ...c, activeTokens: countMap[c.client_id] ?? 0 })),
    appOrigin,
  };
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

export default function OAuthClientsSettings({ loaderData }: Route.ComponentProps) {
  const { clients, appOrigin } = loaderData as { clients: OAuthClientRow[]; appOrigin: string };
  const revalidator = useRevalidator();

  const [createOpen, setCreateOpen] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{
    clientId: string;
    clientSecret: string | null;
    name: string;
  } | null>(null);
  const [rotatedSecret, setRotatedSecret] = useState<{ clientId: string; secret: string } | null>(
    null,
  );
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

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

  const { mutate: createClient, isPending: creating } = useMutation({
    mutationFn: (data: CreateClientData) =>
      callAction({
        intent: "create",
        name: data.name,
        redirectUris: data.redirectUris.join("\n"),
        isPublic: String(data.isPublic),
      }),
    onSuccess: (result, variables) => {
      const created = result.created as {
        client_id?: string;
        client_secret?: string;
        client_name?: string;
      } | null;
      if (created?.client_id) {
        setNewCredentials({
          clientId: created.client_id,
          clientSecret: created.client_secret ?? null,
          name: created.client_name ?? variables.name,
        });
      }
      setCreateOpen(false);
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: deleteClient } = useMutation({
    mutationFn: (clientId: string) => callAction({ intent: "delete", clientId }),
    onSuccess: () => {
      toast.success("OAuth app deleted");
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: rotateSecret } = useMutation({
    mutationFn: (clientId: string) => callAction({ intent: "rotate", clientId }),
    onSuccess: (result, clientId) => {
      const secret = result.secret as string | null;
      if (secret) setRotatedSecret({ clientId, secret });
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleConfirm() {
    if (!confirmAction) return;
    if (confirmAction.type === "delete") deleteClient(confirmAction.clientId);
    else rotateSecret(confirmAction.clientId);
    setConfirmAction(null);
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>

      <main className="p-6 max-w-[860px] mx-auto w-full space-y-8">
        <PageHeader
          title="OAuth Apps"
          description="Register apps that authenticate users via your workspace."
          action={
            <CreateClientDialog
              open={createOpen}
              onOpenChange={setCreateOpen}
              creating={creating}
              onSubmit={createClient}
            />
          }
        />

        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">Registered Apps</h3>
          <ClientsTable
            clients={clients}
            onCreateClick={() => setCreateOpen(true)}
            onRotate={(c) =>
              setConfirmAction({
                type: "rotate",
                clientId: c.client_id,
                clientName: c.client_name,
                activeTokens: c.activeTokens,
              })
            }
            onDelete={(c) =>
              setConfirmAction({
                type: "delete",
                clientId: c.client_id,
                clientName: c.client_name,
                activeTokens: c.activeTokens,
              })
            }
          />
        </section>

        {newCredentials && (
          <NewCredentialsReveal
            credentials={newCredentials}
            onDismiss={() => setNewCredentials(null)}
          />
        )}

        {rotatedSecret && (
          <RotatedSecretReveal
            secret={rotatedSecret.secret}
            onDismiss={() => setRotatedSecret(null)}
          />
        )}

        <section className="rounded-lg border border-border bg-muted/10 p-6 space-y-3">
          <h3 className="text-sm font-semibold">OAuth 2.1 Endpoints</h3>
          <p className="text-sm text-muted-foreground">
            Use these URLs to configure your OAuth client.
          </p>
          <div className="space-y-1.5">
            {OAUTH_ENDPOINTS.map(([label, path]) => {
              const fullUrl = `${appOrigin}${path}`;
              return (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <span className="w-36 text-muted-foreground shrink-0 text-xs">{label}</span>
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <code className="font-mono text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                      {fullUrl}
                    </code>
                    <CopyButton
                      value={fullUrl}
                      label={label}
                      iconSize={13}
                      className="p-1.5 shrink-0"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <ConfirmActionDialog
        action={confirmAction}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}

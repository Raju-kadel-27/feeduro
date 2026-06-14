import { PageTitle } from "@components/common/page-title";
import { requireOrgBySlug } from "@features/auth/server/guards";
import {
  ClientsTable,
  type OAuthClientRow,
} from "@features/oauth-clients/components/clients-table";
import {
  type ConfirmAction,
  ConfirmActionDialog,
} from "@features/oauth-clients/components/confirm-action-dialog";
import { CreateClientDialog } from "@features/oauth-clients/components/create-client-dialog";
import {
  NewCredentialsReveal,
  RotatedSecretReveal,
} from "@features/oauth-clients/components/credentials-reveal";
import { useMutation } from "@tanstack/react-query";
import { and, count, gt, inArray, isNull, or } from "drizzle-orm";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { auth } from "@/app/lib/auth/server";
import { getDb } from "@/db";
import { oauthAccessToken } from "@/db/schema";

import type { Route } from "./+types/oauth-clients";

export function meta() {
  return [{ title: "OAuth Apps — Feeduro" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireOrgBySlug(request, params.orgSlug);

  const result = await auth.api.getOAuthClients({ headers: request.headers });
  const clients = (result?.data ?? []) as Omit<OAuthClientRow, "activeTokens">[];

  if (clients.length === 0) return { clients: [] as OAuthClientRow[] };

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
  };
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
    const uris = redirectUris.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean);
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
    await auth.api.deleteOAuthClient({ headers: request.headers, body: { client_id: parsed.data.clientId } });
    return { deleted: true };
  }

  if (intent === "rotate") {
    const parsed = RotateSecretSchema.safeParse(raw);
    if (!parsed.success) return { error: "Invalid input" };
    const result = await auth.api.rotateClientSecret({ headers: request.headers, body: { client_id: parsed.data.clientId } });
    return { secret: (result?.data as { client_secret?: string })?.client_secret ?? null };
  }

  return { error: "Unknown intent" };
}

export function ErrorBoundary() {
  return (
    <div className="p-6 text-sm text-destructive">
      Failed to load OAuth apps. Please refresh and try again.
    </div>
  );
}

export default function OAuthClientsSettings({ loaderData }: Route.ComponentProps) {
  const { clients } = loaderData as { clients: OAuthClientRow[] };
  const revalidator = useRevalidator();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [redirectUris, setRedirectUris] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{ clientId: string; clientSecret: string | null; name: string } | null>(null);
  const [rotatedSecret, setRotatedSecret] = useState<{ clientId: string; secret: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

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
    mutationFn: () => callAction({ intent: "create", name, redirectUris, isPublic: String(isPublic) }),
    onSuccess: (result) => {
      const created = result.created as { client_id?: string; client_secret?: string; client_name?: string } | null;
      if (created?.client_id) {
        setNewCredentials({ clientId: created.client_id, clientSecret: created.client_secret ?? null, name: created.client_name ?? name });
      }
      setName(""); setRedirectUris(""); setIsPublic(false); setCreateOpen(false);
      revalidator.revalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: deleteClient } = useMutation({
    mutationFn: (clientId: string) => callAction({ intent: "delete", clientId }),
    onSuccess: () => { toast.success("OAuth app deleted"); revalidator.revalidate(); },
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
      <PageTitle
        title="OAuth Apps"
        action={
          <CreateClientDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            name={name}
            onNameChange={setName}
            redirectUris={redirectUris}
            onRedirectUrisChange={setRedirectUris}
            isPublic={isPublic}
            onIsPublicChange={setIsPublic}
            creating={creating}
            onSubmit={createClient}
          />
        }
      />

      <main className="p-6 max-w-[860px] mx-auto w-full space-y-6">
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3">Registered Apps</h3>
          <ClientsTable
            clients={clients}
            onRotate={(c) => setConfirmAction({ type: "rotate", clientId: c.client_id, clientName: c.client_name, activeTokens: c.activeTokens })}
            onDelete={(c) => setConfirmAction({ type: "delete", clientId: c.client_id, clientName: c.client_name, activeTokens: c.activeTokens })}
          />
        </section>

        {newCredentials && (
          <NewCredentialsReveal credentials={newCredentials} onDismiss={() => setNewCredentials(null)} />
        )}

        {rotatedSecret && (
          <RotatedSecretReveal secret={rotatedSecret.secret} onDismiss={() => setRotatedSecret(null)} />
        )}

        <section className="rounded-lg border border-border bg-muted/10 p-6 space-y-3">
          <h3 className="text-sm font-semibold">OAuth 2.1 Endpoints</h3>
          <p className="text-sm text-muted-foreground">Use these URLs to configure your OAuth client.</p>
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

      <ConfirmActionDialog
        action={confirmAction}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}

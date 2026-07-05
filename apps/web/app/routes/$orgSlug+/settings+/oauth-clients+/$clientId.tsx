import { requireOrganization } from "@features/auth/server/guards";
import { AppDetailView } from "@features/oauth-clients/components/app-detail-view";
import type { OAuthClientRow } from "@features/oauth-clients/components/clients-table";
import { DeleteAppDialog } from "@features/oauth-clients/components/delete-app-dialog";
import { useMutation } from "@tanstack/react-query";
import { and, count, eq, gt, isNull, or } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { isRouteErrorResponse, useLocation, useNavigate, useRevalidator } from "react-router";
import { toast } from "sonner";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { oauthAccessToken, oauthClient } from "@/db/schema";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/$clientId";

export function meta() {
  return [{ title: "OAuth App — Feeduro" }];
}

function parseUris(raw: string): string[] {
  if (!raw) return [];
  if (raw.startsWith("[")) {
    try {
      return JSON.parse(raw) as string[];
    } catch {}
  }
  if (raw.startsWith("{") && raw.endsWith("}")) {
    return raw
      .slice(1, -1)
      .split(",")
      .map((s) => s.replace(/^"|"$/g, "").trim())
      .filter(Boolean);
  }
  return raw
    .split(/[\n,]+/)
    .map((u) => u.trim())
    .filter(Boolean);
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  const { organizationId } = await requireOrganization(db, request);
  const appOrigin = new URL(request.url).origin;

  const row = await db.query.oauthClient.findFirst({
    where: and(
      eq(oauthClient.clientId, params.clientId),
      eq(oauthClient.referenceId, organizationId),
    ),
    columns: {
      clientId: true,
      name: true,
      redirectUris: true,
      icon: true,
      public: true,
      disabled: true,
      tokenEndpointAuthMethod: true,
      createdAt: true,
    },
  });

  if (!row) throw new Response("Not found", { status: 404 });

  const [tokenCount] = await db
    .select({ total: count() })
    .from(oauthAccessToken)
    .where(
      and(
        eq(oauthAccessToken.clientId, params.clientId),
        or(isNull(oauthAccessToken.expiresAt), gt(oauthAccessToken.expiresAt, new Date())),
      ),
    );

  const client: OAuthClientRow = {
    client_id: row.clientId,
    client_name: row.name ?? undefined,
    redirect_uris: parseUris(row.redirectUris),
    token_endpoint_auth_method: row.tokenEndpointAuthMethod ?? undefined,
    client_id_issued_at: row.createdAt
      ? Math.floor(row.createdAt.getTime() / 1000)
      : undefined,
    disabled: row.disabled ?? undefined,
    public: row.public ?? undefined,
    icon: row.icon ?? undefined,
    activeTokens: tokenCount?.total ?? 0,
  };

  return { client, appOrigin };
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        OAuth app not found. It may have been deleted.
      </div>
    );
  }
  return (
    <div className="p-6 text-sm text-destructive">Something went wrong. Please refresh.</div>
  );
}

export default function OAuthClientDetailPage({ loaderData }: Route.ComponentProps) {
  const { client, appOrigin } = loaderData;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const location = useLocation();

  const [newSecret, setNewSecret] = useState<string | null>(
    (location.state as { newSecret?: string } | null)?.newSecret ?? null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);

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
    mutationFn: () => callAction({ intent: "delete", clientId: client.client_id }),
    onSuccess: () => {
      toast.success("OAuth app deleted");
      navigate("..", { relative: "path" });
    },
    onError: (err) => toast.error(err.message),
  });

  const { mutate: rotateSecret, isPending: rotating } = useMutation({
    mutationFn: () => callAction({ intent: "rotate", clientId: client.client_id }),
    onSuccess: (result) => {
      const secret = result.secret as string | null;
      setNewSecret(secret);
      revalidator.revalidate();
      if (secret) toast.success("Secret rotated — copy it now");
    },
    onError: (err) => toast.error(err.message),
  });

  async function revealSecret(): Promise<string | null> {
    try {
      const result = await callAction({ intent: "reveal", clientId: client.client_id });
      return (result.secret as string | null) ?? null;
    } catch {
      return null;
    }
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>

      <main className="px-6 pb-6">
        {/* Centering wrapper — back button sits in the left gutter without shifting content */}
        <div className="relative max-w-[720px] mx-auto">
          <div className="hidden lg:block absolute top-0 right-full h-full pr-16 pointer-events-none">
            <div className="sticky top-[36px] pointer-events-auto pt-2">
              <button
                type="button"
                onClick={() => navigate("..", { relative: "path" })}
                className="group inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-foreground hover:bg-muted/50 border border-transparent hover:border-border transition-all whitespace-nowrap"
              >
                <ArrowLeft
                  size={14}
                  className="transition-transform group-hover:-translate-x-0.5"
                />
                Back
              </button>
            </div>
          </div>

          <AppDetailView
            client={client}
            newSecret={newSecret}
            appOrigin={appOrigin}
            rotating={rotating}
            onEdit={() => navigate("edit", { relative: "path" })}
            onRotateConfirm={() => rotateSecret()}
            onDelete={() => setDeleteOpen(true)}
            onRevealSecret={revealSecret}
          />
        </div>
      </main>

      <DeleteAppDialog
        open={deleteOpen}
        appName={client.client_name ?? client.client_id}
        activeTokens={client.activeTokens}
        deleting={deleting}
        onConfirm={() => deleteClient()}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}

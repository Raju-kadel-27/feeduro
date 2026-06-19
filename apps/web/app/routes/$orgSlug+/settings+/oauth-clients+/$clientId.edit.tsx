import { requireOrganization } from "@features/auth/server/guards";
import { OAuthClientForm } from "@features/oauth-clients/components/oauth-client-form";
import type { OAuthClientFormData } from "@features/oauth-clients/schemas/oauth-client";
import { useMutation } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { isRouteErrorResponse, Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { SidebarTrigger } from "@/app/components/ui/sidebar";
import { getDb } from "@/db";
import { oauthClient } from "@/db/schema";

import type { Route } from "./+types/$clientId.edit";

export function meta() {
  return [{ title: "Edit OAuth App — Feeduro" }];
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

export async function loader({ request, params }: Route.LoaderArgs) {
  const { organizationId } = await requireOrganization(request);

  const db = getDb();
  const row = await db.query.oauthClient.findFirst({
    where: and(
      eq(oauthClient.clientId, params.clientId),
      eq(oauthClient.referenceId, organizationId),
    ),
    columns: {
      clientId: true,
      name: true,
      redirectUris: true,
      uri: true,
      metadata: true,
    },
  });

  if (!row) throw new Response("Not found", { status: 404 });

  let meta: { developerName?: string; description?: string } = {};
  try {
    if (row.metadata) meta = JSON.parse(row.metadata) as typeof meta;
  } catch {}

  return {
    clientId: row.clientId,
    clientName: row.name ?? "",
    initialData: {
      name: row.name ?? "",
      developerName: meta.developerName ?? "",
      developerUrl: row.uri ?? "",
      description: meta.description ?? "",
      redirectUris: parseUris(row.redirectUris).join("\n"),
    },
  };
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        OAuth app not found. It may have been deleted.
      </div>
    );
  }
  return <div className="p-6 text-sm text-destructive">Something went wrong. Please refresh.</div>;
}

export default function EditOAuthClientPage({ loaderData }: Route.ComponentProps) {
  const { clientId, clientName, initialData } = loaderData;
  const navigate = useNavigate();

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

  const { mutate: updateClient, isPending: saving } = useMutation({
    mutationFn: (formData: OAuthClientFormData) => {
      const uris = formData.redirectUris
        .split(/\n/)
        .map((u) => u.trim())
        .filter(Boolean);
      return callAction({
        intent: "update",
        clientId,
        name: formData.name,
        developerName: formData.developerName,
        developerUrl: formData.developerUrl,
        description: formData.description,
        redirectUris: uris,
      });
    },
    onSuccess: () => {
      toast.success("App updated");
      navigate("..", { relative: "path" });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
        <SidebarTrigger className="-ml-1" />
      </header>

      <main className="p-6 max-w-[975px] mx-auto w-full">
        <div className="flex gap-6">
          {/* Sticky back button — left of form on desktop */}
          <div className="hidden lg:block w-28 shrink-0 pt-1">
            <div className="sticky top-[76px]">
              <Link
                to="../.."
                relative="path"
                className="group inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent hover:border-border transition-all"
              >
                <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
                Back
              </Link>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-8">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">Edit Application</h1>
              <p className="text-sm text-muted-foreground">{clientName || clientId}</p>
            </div>

            <section className="rounded-lg border border-border bg-muted/10 p-6">
              <OAuthClientForm
                mode="edit"
                initialData={initialData}
                submitting={saving}
                onSubmit={updateClient}
                onCancel={() => navigate("../..", { relative: "path" })}
              />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

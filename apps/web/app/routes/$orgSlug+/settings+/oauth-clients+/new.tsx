import { requireOrgBySlug } from "@features/auth/server/guards";
import { CopyButton } from "@features/oauth-clients/components/copy-button";
import { OAuthClientForm } from "@features/oauth-clients/components/oauth-client-form";
import type { OAuthClientFormData } from "@features/oauth-clients/schemas/oauth-client";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { getDb } from "~/middleware/cloudflare.server";

import type { Route } from "./+types/new";

export function meta() {
  return [{ title: "Register OAuth App — Feeduro" }];
}

export function shouldRevalidate() {
  return false;
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const db = getDb(context);
  await requireOrgBySlug(db, request, params.orgSlug);
  return {};
}

type PageState =
  | { type: "form" }
  | { type: "success"; clientId: string; clientName: string; secret: string | null };

function BackButton() {
  return (
    <div className="hidden lg:block w-28 shrink-0 pt-1">
      <div className="sticky top-[76px]">
        <Link
          to=".."
          relative="path"
          className="group inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent hover:border-border transition-all"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          Back
        </Link>
      </div>
    </div>
  );
}

export default function NewOAuthClientPage() {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>({ type: "form" });

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
    mutationFn: (formData: OAuthClientFormData) => {
      const uris = formData.redirectUris
        .split(/\n/)
        .map((u) => u.trim())
        .filter(Boolean);
      return callAction({
        intent: "create",
        name: formData.name,
        developerName: formData.developerName,
        developerUrl: formData.developerUrl,
        description: formData.description,
        redirectUris: uris.join("\n"),
      });
    },
    onSuccess: (result) => {
      const created = result.created as {
        client_id?: string;
        client_secret?: string;
        client_name?: string;
      } | null;
      if (created?.client_id) {
        setPageState({
          type: "success",
          clientId: created.client_id,
          clientName: created.client_name ?? "",
          secret: created.client_secret ?? null,
        });
      }
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <>
      <header className="flex h-14 shrink-0 items-center px-4">
      </header>

      <main className="p-6 max-w-[975px] mx-auto w-full">
        {pageState.type === "success" ? (
          <div className="flex gap-6">
            <BackButton />
            <div className="flex-1 min-w-0 space-y-8">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 shrink-0">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">App registered</h2>
                  <p className="text-sm text-muted-foreground">
                    {pageState.clientName || pageState.clientId}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.07] overflow-hidden">
                <div className="flex items-start gap-3 px-4 py-3 border-b border-amber-500/20">
                  <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      Copy your credentials now
                    </p>
                    <p className="text-xs text-amber-600/70 dark:text-amber-400/60 mt-0.5">
                      The client secret is shown only once. Store it somewhere safe before
                      continuing.
                    </p>
                  </div>
                </div>

                <div className="px-4 py-5 space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Client ID</p>
                    <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5">
                      <code className="text-sm font-mono flex-1 break-all text-foreground">
                        {pageState.clientId}
                      </code>
                      <CopyButton
                        value={pageState.clientId}
                        label="client ID"
                        iconSize={13}
                        className="p-1.5 shrink-0"
                      />
                    </div>
                  </div>

                  {pageState.secret && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Client Secret</p>
                      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5">
                        <code className="text-sm font-mono flex-1 break-all text-foreground">
                          {pageState.secret}
                        </code>
                        <CopyButton
                          value={pageState.secret}
                          label="client secret"
                          iconSize={13}
                          className="p-1.5 shrink-0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Link
                  to=".."
                  relative="path"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  View registered apps
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-6">
            <BackButton />
            <div className="flex-1 min-w-0 space-y-8">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold">Register an OAuth App</h1>
                <p className="text-sm text-muted-foreground">
                  Register a new application to let external services authenticate users through your
                  workspace.
                </p>
              </div>

              <section className="rounded-lg border border-border bg-muted/10 p-6">
                <OAuthClientForm
                  mode="create"
                  submitting={creating}
                  onSubmit={createClient}
                  onCancel={() => navigate("..", { relative: "path" })}
                />
              </section>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

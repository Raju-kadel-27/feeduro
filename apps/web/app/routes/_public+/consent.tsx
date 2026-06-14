import { authClient } from "@lib/auth/client";
import { requireSession } from "@lib/session";
import { cn } from "@lib/utils";
import { eq } from "drizzle-orm";
import {
  ExternalLink,
  Fingerprint,
  GalleryVerticalEnd,
  Loader2,
  Mail,
  RefreshCcw,
  ShieldAlert,
  User,
} from "lucide-react";
import { useState } from "react";
import { redirect } from "react-router";
import { getDb } from "@/db";
import { oauthClient } from "@/db/schema";

import type { Route } from "./+types/consent";

export function meta() {
  return [{ title: "Authorize Application — Feediyo" }];
}

const SCOPE_DEFS: Record<
  string,
  { label: string; description: string; Icon: React.ElementType; color: string }
> = {
  openid: {
    label: "Verify your identity",
    description: "Confirm who you are — no other data is shared",
    Icon: Fingerprint,
    color: "text-violet-500 bg-violet-500/10",
  },
  profile: {
    label: "See your profile",
    description: "Your display name and profile picture",
    Icon: User,
    color: "text-blue-500 bg-blue-500/10",
  },
  email: {
    label: "Read your email address",
    description: "Your primary email — never used to send you mail",
    Icon: Mail,
    color: "text-sky-500 bg-sky-500/10",
  },
  offline_access: {
    label: "Stay signed in",
    description: "Access your account even when you're not actively using it",
    Icon: RefreshCcw,
    color: "text-amber-500 bg-amber-500/10",
  },
};

export async function loader({ request }: Route.LoaderArgs) {
  const session = await requireSession(request);

  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  const scopeParam = url.searchParams.get("scope") ?? "";

  if (!clientId) throw redirect("/");

  const db = getDb();
  const client = await db.query.oauthClient.findFirst({
    where: eq(oauthClient.clientId, clientId),
    columns: {
      clientId: true,
      name: true,
      icon: true,
      uri: true,
      policy: true,
      tos: true,
    },
  });

  if (!client) throw redirect("/");

  const scopes = scopeParam
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    client,
    scopes,
    user: {
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    },
  };
}

export default function ConsentPage({ loaderData }: Route.ComponentProps) {
  const { client, scopes, user } = loaderData;
  const [loading, setLoading] = useState<"accept" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConsent(accept: boolean) {
    setLoading(accept ? "accept" : "deny");
    setError(null);
    try {
      await authClient.oauth2.consent({
        accept,
        ...(accept && scopes.length > 0 ? { scope: scopes.join(" ") } : {}),
        fetchOptions: {
          onError(ctx) {
            setError(ctx.error.message ?? "Something went wrong. Please try again.");
            setLoading(null);
          },
        },
      });
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  const hostname = client.uri
    ? (() => {
        try {
          return new URL(client.uri).hostname;
        } catch {
          return client.uri;
        }
      })()
    : null;

  const appName = client.name ?? "Unknown Application";

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-4 sm:p-8">
      {/* Wordmark */}
      <a
        href="/"
        className="mb-8 flex items-center gap-2 font-semibold text-foreground/70 hover:text-foreground transition-colors"
      >
        <div className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground">
          <GalleryVerticalEnd className="size-3" />
        </div>
        <span className="text-sm">Feediyo</span>
      </a>

      {/* Card */}
      <div className="w-full max-w-[400px] rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
        {/* App identity block */}
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-start gap-4">
            {client.icon ? (
              <img
                src={client.icon}
                alt={appName}
                className="size-14 rounded-xl object-cover ring-1 ring-border shrink-0"
              />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-xl bg-secondary ring-1 ring-border shrink-0">
                <ShieldAlert className="size-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 pt-0.5">
              <h1 className="text-[15px] font-semibold text-foreground leading-snug truncate">
                {appName}
              </h1>
              {hostname && (
                <a
                  href={client.uri ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {hostname}
                  <ExternalLink className="size-3" />
                </a>
              )}
              <p className="mt-2 text-sm text-muted-foreground leading-snug">
                is requesting access to your Feediyo account
              </p>
            </div>
          </div>
        </div>

        {/* Authorized-as chip */}
        <div className="mx-6 mb-5 flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="size-7 rounded-full object-cover ring-1 ring-border shrink-0"
            />
          ) : (
            <div className="flex size-7 items-center justify-center rounded-full bg-secondary ring-1 ring-border shrink-0 text-[11px] font-semibold text-muted-foreground uppercase">
              {user.name?.charAt(0) ?? "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground leading-none mb-0.5">Authorizing as</p>
            <p className="text-xs font-medium text-foreground truncate">{user.email}</p>
          </div>
        </div>

        {/* Scopes */}
        <div className="border-t border-border">
          <div className="px-6 py-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {appName} will be able to
            </p>
            {scopes.length > 0 ? (
              <ul className="space-y-3">
                {scopes.map((scope) => {
                  const def = SCOPE_DEFS[scope];
                  const Icon = def?.Icon;
                  return (
                    <li key={scope} className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg",
                          def?.color ?? "text-muted-foreground bg-muted",
                        )}
                      >
                        {Icon ? (
                          <Icon className="size-4" />
                        ) : (
                          <ShieldAlert className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground leading-none mb-0.5">
                          {def?.label ?? scope}
                        </p>
                        {def?.description && (
                          <p className="text-xs text-muted-foreground leading-snug">
                            {def.description}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Basic access to your account.</p>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* CTAs */}
        <div className="border-t border-border px-6 py-5 space-y-3">
          <button
            type="button"
            onClick={() => handleConsent(true)}
            disabled={loading !== null}
            aria-busy={loading === "accept"}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-60 transition-colors"
          >
            {loading === "accept" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Authorizing…
              </>
            ) : (
              `Authorize ${appName}`
            )}
          </button>

          <button
            type="button"
            onClick={() => handleConsent(false)}
            disabled={loading !== null}
            aria-busy={loading === "deny"}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-50 transition-colors"
          >
            {loading === "deny" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Canceling…
              </>
            ) : (
              "Cancel"
            )}
          </button>
        </div>

        {/* Footer links */}
        {(client.policy || client.tos) && (
          <div className="border-t border-border px-6 py-3 flex items-center gap-3">
            {client.policy && (
              <a
                href={client.policy}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </a>
            )}
            {client.tos && (
              <>
                {client.policy && <span className="text-border">·</span>}
                <a
                  href={client.tos}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </a>
              </>
            )}
          </div>
        )}
      </div>

      <p className="mt-5 text-center text-xs text-muted-foreground/60">
        You can revoke access at any time from within the connected application.
      </p>
    </div>
  );
}

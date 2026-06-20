import { Button } from "@components/ui/button";
import { cn } from "@lib/utils";
import {
  AlertCircle,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { AppAvatar } from "./app-avatar";
import type { OAuthClientRow } from "./clients-table";
import { CopyButton } from "./copy-button";
import { RotateConfirmDialog } from "./rotate-confirm-dialog";

interface Props {
  client: OAuthClientRow;
  newSecret: string | null;
  appOrigin: string;
  rotating: boolean;
  onEdit: () => void;
  onRotateConfirm: () => void;
  onDelete: () => void;
  onRevealSecret: () => Promise<string | null>;
}

function formatDate(issuedAt?: number): string | null {
  if (!issuedAt) return null;
  return new Date(issuedAt * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function downloadManifest(client: OAuthClientRow, appOrigin: string) {
  const manifest = {
    $schema: `${appOrigin}/.well-known/oauth-app-manifest.schema.json`,
    schemaVersion: "1.0.0",
    distribution: client.public ? "public" : "confidential",
    oauth: {
      client_name: client.client_name ?? "Unnamed App",
      client_id: client.client_id,
      redirect_uris: client.redirect_uris ?? [],
      grant_types: ["authorization_code"],
      token_endpoint_auth_method: client.token_endpoint_auth_method ?? "client_secret_basic",
      require_pkce: true,
    },
    endpoints: {
      authorization: `${appOrigin}/api/auth/oauth2/authorize`,
      token: `${appOrigin}/api/auth/oauth2/token`,
      userinfo: `${appOrigin}/api/auth/oauth2/userinfo`,
      discovery: `${appOrigin}/api/auth/.well-known/openid-configuration`,
    },
  };

  const filename = `${(client.client_name ?? "oauth-app").toLowerCase().replace(/\s+/g, "-")}-manifest.json`;
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AppDetailView({
  client,
  newSecret,
  appOrigin,
  rotating,
  onEdit,
  onRotateConfirm,
  onDelete,
  onRevealSecret,
}: Props) {
  const createdAt = formatDate(client.client_id_issued_at);

  const [revealState, setRevealState] = useState<null | "loading" | "unavailable" | string>(
    newSecret ?? null,
  );
  const [secretVisible, setSecretVisible] = useState(!!newSecret);
  const [rotateOpen, setRotateOpen] = useState(false);

  async function handleReveal() {
    setRevealState("loading");
    const result = await onRevealSecret();
    setRevealState(result ?? "unavailable");
    if (result) setSecretVisible(true);
  }

  const activeReveal = newSecret !== null ? newSecret : revealState;
  const secretReady =
    activeReveal !== null && activeReveal !== "loading" && activeReveal !== "unavailable";

  return (
    <>
      <div className="space-y-6">
          {/* Page header: identity + actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <AppAvatar
                name={client.client_name}
                icon={client.icon}
                clientId={client.client_id}
                size="lg"
              />
              <h2 className="text-2xl font-semibold text-foreground leading-tight truncate">
                {client.client_name ?? "Unnamed App"}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadManifest(client, appOrigin)}
              >
                <Download size={13} />
                Download manifest
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil size={13} />
                Edit
              </Button>
            </div>
          </div>

          {/* Unified sections container — only divide-y lines between sections, no inner borders */}
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border bg-muted/10">
            {/* App meta */}
            <div className="px-6 py-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                  client.public
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {client.public ? "Public" : "Confidential"}
              </span>
              {createdAt && (
                <span className="text-sm text-muted-foreground/60">Created {createdAt}</span>
              )}
              {client.activeTokens > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {client.activeTokens} active token{client.activeTokens !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Credentials */}
            <div className="px-6 py-6 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Credentials</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Use these values to configure your OAuth integration.
                </p>
              </div>

              {/* New / rotated secret banner */}
              {newSecret && (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.07] overflow-hidden">
                  <div className="flex items-start gap-3 px-4 py-3 border-b border-amber-500/20">
                    <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                        New secret — copy it now
                      </p>
                      <p className="text-xs text-amber-600/70 dark:text-amber-400/60 mt-0.5">
                        Store it somewhere safe. If the value is hashed in the database, this is
                        your only chance to copy it.
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-4">
                    <div className="flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3">
                      <code className="text-sm font-mono flex-1 break-all text-foreground leading-relaxed">
                        {newSecret}
                      </code>
                      <CopyButton
                        value={newSecret}
                        label="client secret"
                        iconSize={14}
                        className="p-2 shrink-0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Client ID */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Key size={12} className="text-muted-foreground/60 shrink-0" />
                  <span className="text-sm text-muted-foreground font-medium">Client ID</span>
                </div>
                <div className="flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3">
                  <code className="text-sm font-mono flex-1 break-all text-foreground leading-relaxed">
                    {client.client_id}
                  </code>
                  <CopyButton
                    value={client.client_id}
                    label="client ID"
                    iconSize={14}
                    className="p-2 shrink-0"
                  />
                </div>
              </div>

              {/* Client Secret */}
              {!client.public && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Key size={12} className="text-muted-foreground/60 shrink-0" />
                    <span className="text-sm text-muted-foreground font-medium">Client Secret</span>
                  </div>

                  <div className="flex items-center gap-2 rounded-md border border-border bg-background px-4 py-3">
                    {secretReady ? (
                      <code className="text-sm font-mono flex-1 break-all text-foreground leading-relaxed">
                        {secretVisible
                          ? (activeReveal as string)
                          : `${(activeReveal as string).slice(0, 6)}${"*".repeat(12)}`}
                      </code>
                    ) : activeReveal === "unavailable" ? (
                      <span className="text-sm text-muted-foreground/50 flex-1 italic">
                        Secret unavailable — rotate to generate a new one
                      </span>
                    ) : (
                      <span className="text-base font-mono text-muted-foreground/40 flex-1 tracking-[0.18em] select-none leading-none py-0.5">
                        ••••••••••••••••••••
                      </span>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      {secretReady ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setSecretVisible((v) => !v)}
                            aria-label={secretVisible ? "Hide secret" : "Show secret"}
                            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                          >
                            {secretVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <CopyButton
                            value={activeReveal as string}
                            label="client secret"
                            iconSize={16}
                            className="p-2"
                          />
                        </>
                      ) : activeReveal !== "unavailable" ? (
                        <button
                          type="button"
                          onClick={handleReveal}
                          disabled={activeReveal === "loading"}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-background border border-border rounded-md px-2.5 py-1.5 transition-colors disabled:opacity-50"
                        >
                          {activeReveal === "loading" ? (
                            <RefreshCw size={11} className="animate-spin" />
                          ) : (
                            <Eye size={11} />
                          )}
                          {activeReveal === "loading" ? "Loading…" : "Reveal"}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setRotateOpen(true)}
                        aria-label="Rotate client secret"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-background border border-border rounded-md px-2.5 py-1.5 transition-colors ml-1"
                      >
                        <RefreshCw size={11} />
                        Rotate
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground/50 leading-relaxed">
                    {activeReveal === "unavailable"
                      ? "The stored value is hashed. Rotate to generate a new retrievable secret."
                      : "Clicking the rotate icon generates a new secret and immediately invalidates the current one."}
                  </p>
                </div>
              )}
            </div>

            {/* Configuration */}
            <div className="px-6 py-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Configuration</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    App name and allowed redirect URIs.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  <Pencil size={13} />
                  Edit
                </Button>
              </div>

              <div className="space-y-2">
                <span className="text-sm text-muted-foreground font-medium">App name</span>
                <div className="flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3">
                  <span className="text-sm text-foreground flex-1">
                    {client.client_name ?? "Unnamed App"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm text-muted-foreground font-medium">Redirect URIs</span>
                {client.redirect_uris && client.redirect_uris.length > 0 ? (
                  <div className="space-y-2">
                    {client.redirect_uris.map((uri) => (
                      <div
                        key={uri}
                        className="group flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3"
                      >
                        <code className="text-sm font-mono flex-1 break-all text-foreground leading-relaxed">
                          {uri}
                        </code>
                        <a
                          href={uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${uri}`}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all shrink-0"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/50">No redirect URIs configured.</p>
                )}
              </div>
            </div>

          </div>

          {/* Danger Zone — separated from main container */}
          <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/[0.02] px-6 py-5 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-destructive">Delete this app</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Permanently deletes this OAuth app and immediately revokes all active access
                tokens and refresh tokens issued to it. Any integrations or services
                authenticating through this client will lose access and cannot be recovered.
                This action is irreversible.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive hover:border-destructive/50"
            >
              <Trash2 size={13} />
              Delete this app
            </Button>
          </div>
      </div>

      <RotateConfirmDialog
        open={rotateOpen}
        appName={client.client_name ?? client.client_id}
        activeTokens={client.activeTokens}
        rotating={rotating}
        onConfirm={() => {
          setRotateOpen(false);
          onRotateConfirm();
        }}
        onCancel={() => setRotateOpen(false)}
      />
    </>
  );
}

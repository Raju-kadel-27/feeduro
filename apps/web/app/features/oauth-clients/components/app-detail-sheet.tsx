import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@components/ui/sheet";
import { cn } from "@lib/utils";
import { AlertCircle, ChevronRight, ExternalLink, Key, RefreshCw, Trash2, Users } from "lucide-react";
import { AppAvatar } from "./app-avatar";
import type { OAuthClientRow } from "./clients-table";
import { CopyButton } from "./copy-button";

interface Props {
  client: OAuthClientRow | null;
  newSecret: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRotate: (client: OAuthClientRow) => void;
  onDelete: (client: OAuthClientRow) => void;
}

function formatDate(issuedAt?: number): string | null {
  if (!issuedAt) return null;
  return new Date(issuedAt * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-muted-foreground">{children}</p>
  );
}

function FieldLabel({ icon: Icon, children }: { icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      {Icon && <Icon size={11} className="text-muted-foreground/60 shrink-0" />}
      <span className="text-xs text-muted-foreground">{children}</span>
    </div>
  );
}

export function AppDetailSheet({
  client,
  newSecret,
  open,
  onOpenChange,
  onRotate,
  onDelete,
}: Props) {
  if (!client) return null;

  const createdAt = formatDate(client.client_id_issued_at);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto flex flex-col gap-0 p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3.5 pr-8">
            <AppAvatar
              name={client.client_name}
              icon={client.icon}
              clientId={client.client_id}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[15px] font-semibold leading-snug truncate">
                {client.client_name ?? "Unnamed App"}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    client.public
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {client.public ? "Public" : "Confidential"}
                </span>
                {createdAt && (
                  <span className="text-[11px] text-muted-foreground/50">
                    Created {createdAt}
                  </span>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 divide-y divide-border">
          {/* Credentials */}
          <section className="px-6 py-5 space-y-5">
            <SectionLabel>Credentials</SectionLabel>

            {/* New / rotated secret — one-time reveal */}
            {newSecret && (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.07] overflow-hidden">
                <div className="flex items-start gap-2.5 px-4 py-3 border-b border-amber-500/20">
                  <AlertCircle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Copy your secret now — it won't be shown again
                    </p>
                    <p className="text-[11px] text-amber-600/70 dark:text-amber-400/60 mt-0.5">
                      Store it somewhere safe before closing this panel.
                    </p>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-1">
                  <span className="text-[11px] text-muted-foreground">Client Secret</span>
                  <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5 mt-1">
                    <code className="text-xs font-mono flex-1 break-all text-foreground leading-relaxed">
                      {newSecret}
                    </code>
                    <CopyButton value={newSecret} label="client secret" iconSize={13} className="p-1.5 shrink-0" />
                  </div>
                </div>
              </div>
            )}

            {/* Client ID — always visible */}
            <div>
              <FieldLabel icon={Key}>Client ID</FieldLabel>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5">
                <code className="text-xs font-mono flex-1 break-all text-foreground leading-relaxed">
                  {client.client_id}
                </code>
                <CopyButton value={client.client_id} label="client ID" iconSize={13} className="p-1.5 shrink-0" />
              </div>
            </div>

            {/* Secret placeholder — when not freshly issued */}
            {!newSecret && !client.public && (
              <div>
                <FieldLabel icon={Key}>Client Secret</FieldLabel>
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5">
                  <span className="text-[13px] font-mono text-muted-foreground/40 flex-1 tracking-[0.2em] select-none leading-none">
                    ••••••••••••••••••••
                  </span>
                  <button
                    type="button"
                    onClick={() => onRotate(client)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground bg-background border border-border rounded px-2 py-1 transition-colors shrink-0"
                  >
                    <RefreshCw size={10} />
                    Rotate
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground/50 mt-1.5 leading-relaxed">
                  Secrets are stored hashed and cannot be retrieved. Rotate to generate a new one.
                </p>
              </div>
            )}
          </section>

          {/* Configuration */}
          <section className="px-6 py-5 space-y-5">
            <SectionLabel>Configuration</SectionLabel>

            <div>
              <FieldLabel>Redirect URIs</FieldLabel>
              {client.redirect_uris && client.redirect_uris.length > 0 ? (
                <div className="space-y-1.5">
                  {client.redirect_uris.map((uri) => (
                    <div
                      key={uri}
                      className="group flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5"
                    >
                      <code className="text-xs font-mono flex-1 break-all text-foreground leading-relaxed">
                        {uri}
                      </code>
                      <a
                        href={uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${uri}`}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all shrink-0 p-0.5"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/50 py-1">No redirect URIs configured.</p>
              )}
            </div>
          </section>

          {/* Usage */}
          <section className="px-6 py-5 space-y-3">
            <SectionLabel>Usage</SectionLabel>
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users size={13} className="shrink-0" />
                Active tokens
              </div>
              <div className="flex items-center gap-1.5">
                {client.activeTokens > 0 && (
                  <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                )}
                <span className={cn(
                  "text-sm tabular-nums font-medium",
                  client.activeTokens > 0 ? "text-foreground" : "text-muted-foreground",
                )}>
                  {client.activeTokens > 0 ? client.activeTokens : "—"}
                </span>
              </div>
            </div>
          </section>

          {/* Danger zone */}
          <section className="px-6 py-5 space-y-3">
            <SectionLabel>Danger Zone</SectionLabel>
            <div className="space-y-2">
              {!client.public && (
                <button
                  type="button"
                  onClick={() => onRotate(client)}
                  className="group w-full flex items-center gap-3 px-3.5 py-3 rounded-lg border border-border hover:border-border/80 hover:bg-muted/30 transition-all text-left"
                >
                  <RefreshCw size={14} className="text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">Rotate client secret</div>
                    <div className="text-[11px] text-muted-foreground/60 mt-0.5">
                      Invalidates the current secret immediately.
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground/60 transition-colors" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(client)}
                className="group w-full flex items-center gap-3 px-3.5 py-3 rounded-lg border border-destructive/15 hover:border-destructive/30 hover:bg-destructive/[0.04] transition-all text-left"
              >
                <Trash2 size={14} className="text-destructive/60 shrink-0 group-hover:text-destructive transition-colors" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-destructive/80 group-hover:text-destructive transition-colors">
                    Delete app
                  </div>
                  <div className="text-[11px] text-destructive/40 group-hover:text-destructive/60 transition-colors mt-0.5">
                    Permanently removes this app and revokes all tokens.
                  </div>
                </div>
                <ChevronRight size={14} className="text-destructive/20 shrink-0 group-hover:text-destructive/40 transition-colors" />
              </button>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

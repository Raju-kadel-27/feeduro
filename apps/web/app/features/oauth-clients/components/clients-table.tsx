import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { cn } from "@lib/utils";
import { FileDown, Key, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { AppAvatar } from "./app-avatar";

export interface OAuthClientRow {
  client_id: string;
  client_name?: string;
  redirect_uris?: string[];
  token_endpoint_auth_method?: string;
  client_id_issued_at?: number;
  disabled?: boolean;
  public?: boolean;
  icon?: string;
  activeTokens: number;
}

interface Props {
  clients: OAuthClientRow[];
  onRowClick: (client: OAuthClientRow) => void;
  onEdit?: (client: OAuthClientRow) => void;
  onRotate: (client: OAuthClientRow) => void;
  onDelete: (client: OAuthClientRow) => void;
  onCreateClick?: () => void;
  appOrigin?: string;
}

const MANIFEST_ENDPOINTS = [
  ["authorization_endpoint", "/api/auth/oauth2/authorize"],
  ["token_endpoint", "/api/auth/oauth2/token"],
  ["userinfo_endpoint", "/api/auth/oauth2/userinfo"],
  ["discovery_endpoint", "/api/auth/.well-known/openid-configuration"],
] as const;

function downloadManifest(client: OAuthClientRow, appOrigin?: string) {
  const manifest = {
    client_id: client.client_id,
    client_name: client.client_name ?? "Unnamed App",
    redirect_uris: client.redirect_uris ?? [],
    token_endpoint_auth_method: client.token_endpoint_auth_method ?? "client_secret_basic",
    ...(appOrigin && {
      endpoints: Object.fromEntries(
        MANIFEST_ENDPOINTS.map(([key, path]) => [key, `${appOrigin}${path}`]),
      ),
    }),
  };
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${client.client_name ?? client.client_id}-manifest.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ClientsTable({
  clients,
  onRowClick,
  onEdit,
  onRotate,
  onDelete,
  onCreateClick,
  appOrigin,
}: Props) {
  if (clients.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-14 px-8 text-center bg-muted/10 flex flex-col items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted/50">
          <Key size={18} className="text-muted-foreground/50" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">No OAuth apps yet</p>
          <p className="text-xs text-muted-foreground/70 max-w-[280px] mx-auto leading-relaxed">
            Register an app to let external services authenticate users through your workspace.
          </p>
        </div>
        {onCreateClick && (
          <button
            type="button"
            onClick={onCreateClick}
            className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            Register an app
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <ul>
        {clients.map((client, i) => (
          <li
            key={client.client_id}
            className={cn(
              "group flex items-center justify-between px-4 py-3 gap-4 cursor-pointer hover:bg-muted/20 transition-colors",
              i !== 0 && "border-t border-border",
              client.disabled && "opacity-50",
            )}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("[data-stop-row-click]")) return;
              onRowClick(client);
            }}
          >
            {/* App name + avatar */}
            <div className="flex items-center gap-3 min-w-0">
              <AppAvatar name={client.client_name} icon={client.icon} clientId={client.client_id} />
              <span className="text-sm font-medium text-foreground truncate">
                {client.client_name ?? "Unnamed App"}
              </span>
            </div>

            {/* Actions dropdown */}
            <div
              className="shrink-0"
              data-stop-row-click
              // biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation only
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Actions for ${client.client_name ?? client.client_id}`}
                    className="p-2 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-muted/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => (onEdit ? onEdit(client) : onRowClick(client))}
                  >
                    <Pencil size={13} />
                    Edit application
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => downloadManifest(client, appOrigin)}
                  >
                    <FileDown size={13} />
                    Download manifest
                  </DropdownMenuItem>
                  {!client.public && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer"
                        onClick={() => onRotate(client)}
                      >
                        <RefreshCw size={13} />
                        Rotate secret
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => onDelete(client)}
                  >
                    <Trash2 size={13} />
                    Delete app
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

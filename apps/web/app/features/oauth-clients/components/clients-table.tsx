import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { cn } from "@lib/utils";
import { Key, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
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
  onRotate: (client: OAuthClientRow) => void;
  onDelete: (client: OAuthClientRow) => void;
}

export function ClientsTable({ clients, onRotate, onDelete }: Props) {
  if (clients.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center bg-muted/10">
        <Key size={24} className="mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground mb-1">No OAuth apps yet.</p>
        <p className="text-xs text-muted-foreground/70">
          Register an app to let external services authenticate users via your workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center px-4 h-10 bg-muted/20 border-b border-border gap-4">
        <div className="text-xs font-medium text-muted-foreground">App</div>
        <div className="text-xs font-medium text-muted-foreground">Type</div>
        <div className="text-xs font-medium text-muted-foreground text-right">Active tokens</div>
        <div className="w-8" />
      </div>
      <ul>
        {clients.map((client, i) => (
          <li
            key={client.client_id}
            className={cn(
              "group grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-3 gap-4",
              i !== 0 && "border-t border-border",
              client.disabled && "opacity-50",
            )}
          >
            <div className="flex items-start gap-3 min-w-0">
              <AppAvatar name={client.client_name} icon={client.icon} clientId={client.client_id} />
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {client.client_name ?? "Unnamed App"}
                </div>
                <code className="text-xs text-muted-foreground font-mono block truncate">
                  {client.client_id}
                </code>
                {client.redirect_uris && client.redirect_uris.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {client.redirect_uris.slice(0, 2).map((uri) => {
                      let display = uri;
                      try { display = new URL(uri).host + new URL(uri).pathname; } catch {}
                      return (
                        <span
                          key={uri}
                          title={uri}
                          className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground max-w-[200px] truncate"
                        >
                          {display}
                        </span>
                      );
                    })}
                    {client.redirect_uris.length > 2 && (
                      <span className="text-[10px] text-muted-foreground/60">
                        +{client.redirect_uris.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <span
              className={cn(
                "text-xs font-medium px-2 py-1 rounded",
                client.public ? "bg-blue-500/10 text-blue-600" : "bg-muted text-muted-foreground",
              )}
            >
              {client.public ? "Public" : "Confidential"}
            </span>

            <div className="text-sm tabular-nums text-right min-w-[60px]">
              {client.activeTokens > 0 ? (
                <span className="font-medium text-foreground">{client.activeTokens}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>

            <div className="w-8 flex items-center justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Actions for ${client.client_name ?? client.client_id}`}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {!client.public && (
                    <>
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer"
                        onClick={() => onRotate(client)}
                      >
                        <RefreshCw size={13} />
                        Rotate secret
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
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

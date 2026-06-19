import type React from "react";
import { IntegrationActionButton } from "./action-button";
import { IntegrationCardShell } from "./card-shell";
import { IntegrationStatusBadge } from "./status-badge";

interface Props {
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  onClick?: () => void;
  events?: string[];
  action?: React.ReactNode;
  footer?: React.ReactNode;
}

export function OAuthIntegrationCard({ name, description, icon, connected, onClick, events, action, footer }: Props) {
  return (
    <IntegrationCardShell>
      <div className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">{name}</span>

            <IntegrationStatusBadge connected={connected} />
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

          {events && events.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {events.map((event) => (
                <span
                  key={event}
                  className="text-[11px] px-1.5 py-0.5 rounded border border-border bg-background text-foreground/60"
                >
                  {event}
                </span>
              ))}
            </div>
          )}
        </div>

        {action ?? <IntegrationActionButton connected={connected} onClick={onClick} />}
      </div>
      {footer && <div className="border-t border-border px-4 py-3">{footer}</div>}
    </IntegrationCardShell>
  );
}

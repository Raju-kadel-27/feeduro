import { IntegrationActionButton } from "./action-button";
import { IntegrationCardShell } from "./card-shell";
import { IntegrationStatusBadge } from "./status-badge";

interface Props {
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  onClick?: () => void;
}

export function OAuthIntegrationCard({ name, description, icon, connected, onClick }: Props) {
  return (
    <IntegrationCardShell>
      <div className="flex items-start gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">{name}</span>

            <IntegrationStatusBadge connected={connected} />
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>

        <IntegrationActionButton connected={connected} onClick={onClick} />
      </div>
    </IntegrationCardShell>
  );
}

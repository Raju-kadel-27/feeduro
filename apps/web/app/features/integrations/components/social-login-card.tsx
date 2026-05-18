import { cn } from "@lib/utils";
import { IntegrationCardShell } from "./card-shell";

interface Props {
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  docsUrl?: string;
  setupSteps?: string[];
}

export function SocialLoginCard({ name, description, icon, enabled, docsUrl, setupSteps }: Props) {
  return (
    <IntegrationCardShell>
      <div className="flex items-start gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">{name}</span>

            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                enabled ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground",
              )}
            >
              {enabled ? "Connected" : "Not configured"}
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>

      {!enabled && setupSteps && (
        <div className="border-t border-border bg-muted/30 px-4 py-3 space-y-2">
          <p className="text-[11px] font-medium text-foreground">Setup required</p>

          <ol className="space-y-1.5 list-decimal list-inside">
            {setupSteps.map((step, i) => (
              <li key={i} className="text-[11px] text-muted-foreground leading-relaxed">
                {step}
              </li>
            ))}
          </ol>

          {docsUrl && (
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1 text-[11px] text-primary hover:underline"
            >
              View documentation →
            </a>
          )}
        </div>
      )}
    </IntegrationCardShell>
  );
}

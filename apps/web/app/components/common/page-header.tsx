import type { LucideIcon } from "lucide-react";
import type React from "react";

interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}

export function PageHeader({ title, description, action, icon: Icon }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted mt-0.5">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

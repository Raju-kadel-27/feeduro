import { cn } from "@lib/utils";
import type React from "react";

interface Props {
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  comingSoon?: boolean;
  locked?: boolean;
  footer?: React.ReactNode;
  onClick?: () => void;
}

export function IntegrationTile({ name, icon, connected, comingSoon, locked, footer, onClick }: Props) {
  const isDisabled = comingSoon && !locked;
  return (
    <button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-lg border bg-card px-4 py-5 text-center w-full",
        "transition-colors",
        isDisabled ? "opacity-60 cursor-not-allowed" : locked ? "hover:bg-orange-500/5 hover:border-orange-300/50" : "hover:bg-accent/50",
        connected && !locked ? "border-green-500/30" : "border-border",
        footer ? "pb-3" : "",
      )}
    >
      {connected && !locked && (
        <span className="absolute top-2.5 right-2.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600">
          Connected
        </span>
      )}
      {isDisabled && (
        <span className="absolute top-2.5 right-2.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
          Coming soon
        </span>
      )}
      <div className="flex h-10 w-10 items-center justify-center">{icon}</div>
      <span className="text-sm font-medium text-foreground leading-tight">{name}</span>
      {footer && (
        <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
          {footer}
        </div>
      )}
    </button>
  );
}

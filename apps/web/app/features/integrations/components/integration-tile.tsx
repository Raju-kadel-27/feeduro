import type React from "react";
import { cn } from "@lib/utils";

interface Props {
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  onClick?: () => void;
}

export function IntegrationTile({ name, icon, connected, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-lg border bg-card px-4 py-5 text-center w-full",
        "hover:bg-accent/50 transition-colors",
        connected ? "border-green-500/30" : "border-border",
      )}
    >
      {connected && (
        <span className="absolute top-2.5 right-2.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600">
          Connected
        </span>
      )}
      <div className="flex h-10 w-10 items-center justify-center">{icon}</div>
      <span className="text-sm font-medium text-foreground leading-tight">{name}</span>
    </button>
  );
}

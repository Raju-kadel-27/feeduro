import { cn } from "@lib/utils";

interface Props {
  connected: boolean;
}

export function IntegrationStatusBadge({ connected }: Props) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
        connected
          ? "bg-green-500/10 text-green-600"
          : "bg-muted text-muted-foreground",
      )}
    >
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}
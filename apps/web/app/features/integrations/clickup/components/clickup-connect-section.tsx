import { ClickUpIcon } from "@components/icons";
import { useMutation } from "@tanstack/react-query";
import { Check, Unplug } from "lucide-react";
import { useRevalidator } from "react-router";
import { toast } from "sonner";

interface Props {
  connected: boolean;
  workspaceName: string | null;
  isAdmin: boolean;
  onCallApi: (body: object) => Promise<unknown>;
}

export function ClickupConnectSection({ connected, workspaceName, isAdmin, onCallApi }: Props) {
  const revalidator = useRevalidator();

  const { mutate: disconnect, isPending: disconnecting } = useMutation({
    mutationFn: () => onCallApi({ intent: "disconnect" }),
    onSuccess: () => { toast.success("ClickUp disconnected"); revalidator.revalidate(); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Disconnect failed"),
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
          1
        </span>
        <h3 className="text-[13px] font-semibold text-foreground">Connect your ClickUp workspace</h3>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
            <ClickUpIcon className="h-4 w-4 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">ClickUp</p>
            <p className="text-xs text-muted-foreground">
              {connected
                ? workspaceName ? `Connected to ${workspaceName}` : "Workspace connected"
                : "Not connected"}
            </p>
          </div>
          {connected ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full">
                <Check size={11} /> Connected
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => disconnect()}
                  disabled={disconnecting}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                >
                  <Unplug size={12} /> {disconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              )}
            </div>
          ) : isAdmin ? (
            <a
              href="/api/clickup?intent=connect"
              className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80 transition-colors"
            >
              <ClickUpIcon className="h-3 w-3" /> Connect ClickUp
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

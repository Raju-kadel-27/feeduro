import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { CopyButton } from "./shared";

export function RotatedSecretDialog({ secret, onClose }: { secret: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New signing secret</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertCircle size={16} className="shrink-0" />
            <p className="text-sm font-medium">Copy this now — it won't be shown again.</p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/10 px-4 py-3">
            <code className="text-sm font-mono text-foreground flex-1 break-all">{secret}</code>
            <CopyButton value={secret} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            Done, I've saved my secret
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

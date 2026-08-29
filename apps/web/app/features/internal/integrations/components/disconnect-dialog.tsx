import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@components/ui/alert-dialog";
import { Unplug } from "lucide-react";

interface DisconnectDialogProps {
  integrationName: string;
  consequence?: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export function DisconnectDialog({
  integrationName,
  consequence,
  onConfirm,
  isPending,
}: DisconnectDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={isPending}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
        >
          <Unplug size={12} />
          {isPending ? "Disconnecting…" : "Disconnect"}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect {integrationName}?</AlertDialogTitle>
          <AlertDialogDescription>
            {consequence ??
              `This will remove the ${integrationName} integration from your workspace.`}{" "}
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

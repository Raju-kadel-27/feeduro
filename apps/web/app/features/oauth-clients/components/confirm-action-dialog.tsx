import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog";
import { cn } from "@lib/utils";

export interface ConfirmAction {
  type: "delete" | "rotate";
  clientId: string;
  clientName?: string;
  activeTokens: number;
}

export function ConfirmActionDialog({
  action,
  onConfirm,
  onCancel,
}: {
  action: ConfirmAction | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const label = action?.clientName ?? action?.clientId ?? "";

  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {action?.type === "delete" ? "Delete OAuth App" : "Rotate Client Secret"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              {action?.type === "delete" ? (
                <>
                  Permanently delete <strong className="text-foreground">{label}</strong>?{" "}
                  {action.activeTokens > 0 && (
                    <>
                      This will immediately revoke{" "}
                      <strong className="text-foreground">
                        {action.activeTokens} active token{action.activeTokens !== 1 ? "s" : ""}
                      </strong>{" "}
                      for users who authorized this app.{" "}
                    </>
                  )}
                  This cannot be undone.
                </>
              ) : (
                <>
                  Rotate the secret for <strong className="text-foreground">{label}</strong>? The
                  current secret will stop working immediately — all integrations using it will
                  break until updated with the new secret.
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              action?.type === "delete" &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
            onClick={onConfirm}
          >
            {action?.type === "delete" ? "Delete App" : "Rotate Secret"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

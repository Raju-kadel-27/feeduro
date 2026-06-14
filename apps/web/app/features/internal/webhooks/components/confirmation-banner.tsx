import { cn } from "@lib/utils";
import { AlertTriangle } from "lucide-react";

interface ConfirmationBannerProps {
  type: "rotate" | "delete";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationBanner({ type, onConfirm, onCancel }: ConfirmationBannerProps) {
  const isRotate = type === "rotate";

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 flex items-start gap-3",
        isRotate ? "border-amber-500/30 bg-amber-500/10" : "border-destructive/30 bg-destructive/5",
      )}
    >
      <AlertTriangle
        size={15}
        className={cn("mt-0.5 shrink-0", isRotate ? "text-amber-600" : "text-destructive")}
      />
      <div className="flex-1 space-y-2">
        <p
          className={cn(
            "text-sm font-medium",
            isRotate ? "text-amber-800 dark:text-amber-400" : "text-destructive",
          )}
        >
          {isRotate ? "Rotate signing secret?" : "Delete this endpoint?"}
        </p>
        <p
          className={cn(
            "text-xs",
            isRotate ? "text-amber-700 dark:text-amber-500" : "text-muted-foreground",
          )}
        >
          {isRotate
            ? "Your current secret will stop working immediately. Update your consumer before rotating."
            : "Deliveries will stop immediately. This cannot be undone."}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium hover:bg-opacity-90 transition-colors",
              isRotate
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
          >
            {isRotate ? "Yes, rotate it" : "Yes, delete"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md border border-border bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

import { cn } from "@lib/utils";

interface AlertProps extends React.ComponentProps<"div"> {
  variant?: "default" | "success" | "destructive";
}

export function Alert({ className, variant = "default", ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        variant === "default" && "border-border bg-muted text-foreground",
        variant === "success" &&
          "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200",
        variant === "destructive" && "border-destructive/30 bg-destructive/10 text-destructive",
        className,
      )}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("leading-relaxed", className)} {...props} />;
}

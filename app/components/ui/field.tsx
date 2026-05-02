import { cn } from "@lib/utils";

export function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-4", className)} {...props} />;
}

export function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

export function FieldLabel({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}

export function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

interface FieldSeparatorProps extends React.ComponentProps<"div"> {
  children?: React.ReactNode;
}

export function FieldSeparator({ className, children, ...props }: FieldSeparatorProps) {
  return (
    <div className={cn("relative flex items-center", className)} {...props}>
      <span className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </span>
      <span
        data-slot="field-separator-content"
        className="relative mx-auto bg-background px-2 text-xs uppercase text-muted-foreground"
      >
        {children}
      </span>
    </div>
  );
}

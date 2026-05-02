import { cn } from "@lib/utils";
import { Slot } from "@radix-ui/react-slot";

interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

export function Button({
  className,
  variant = "default",
  size = "default",
  asChild,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "cursor-pointer disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        size === "default" && "h-9 w-full px-4 py-2 [&_svg]:size-4",
        size === "sm" && "h-8 px-3 py-1.5 text-xs [&_svg]:size-3.5",
        size === "lg" && "h-10 px-6 py-2.5 [&_svg]:size-4",
        size === "icon" && "h-9 w-9 [&_svg]:size-4",
        variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "outline" &&
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

import { Info } from "lucide-react";

interface BrandingHintProps {
  text: string;
}

export function BrandingHint({ text }: BrandingHintProps) {
  return (
    <span className="group relative inline-flex items-center ml-1.5">
      <Info className="size-3.5 text-muted-foreground" />

      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[220px] rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md opacity-0 transition-opacity group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

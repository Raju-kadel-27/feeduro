import { cn } from "@lib/utils";
import { Search } from "lucide-react";

type Size = "sm" | "md" | "lg";

interface Props {
  value: string;
  onChange: (value: string) => void;
  size?: Size;
  className?: string;
}

const SIZE: Record<Size, { wrap: string; icon: string; input: string }> = {
  sm: {
    wrap: "",
    icon: "h-3 w-3",
    input: "h-7 pl-7 pr-3 text-[12px] rounded-md",
  },
  md: {
    wrap: "",
    icon: "h-3.5 w-3.5",
    input: "h-9 pl-8 pr-3 text-sm rounded-md",
  },
  lg: {
    wrap: "",
    icon: "h-4 w-4",
    input: "h-10 pl-9 pr-4 text-sm rounded-lg",
  },
};

export function ChangelogSearchInput({ value, onChange, size = "md", className }: Props) {
  const s = SIZE[size];
  return (
    <div className={cn("relative", s.wrap, className)}>
      <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none", s.icon)} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search changelogs..."
        className={cn(
          "w-full border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
          s.input,
        )}
      />
    </div>
  );
}

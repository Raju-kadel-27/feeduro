import { cn } from "@lib/utils";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface Props {
  value: string;
  label: string;
  iconSize?: number;
  className?: string;
}

export function CopyButton({ value, label, iconSize = 16, className }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      className={cn(
        "p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors bg-muted/10 hover:bg-muted/20",
        className,
      )}
    >
      {copied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
    </button>
  );
}

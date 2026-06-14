import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { SUPPORTED_EVENTS } from "../constants";

export function CopyButton({ value }: { value: string }) {
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
      title="Copy"
      className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors bg-muted/10 hover:bg-muted/20"
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}

export function EventBadge({ event }: { event: string }) {
  const label = SUPPORTED_EVENTS.find((e) => e.value === event)?.label ?? event;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground border border-border">
      {label}
    </span>
  );
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(date));
}

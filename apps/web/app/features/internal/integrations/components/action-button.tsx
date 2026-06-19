import { ArrowRight } from "lucide-react";

interface Props {
  connected: boolean;
  onClick?: () => void;
  label?: string;
}

export function IntegrationActionButton({ connected, onClick, label }: Props) {
  const text = label ?? (connected ? "Manage" : "Set up");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={text}
      className="shrink-0 flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80 transition-colors"
    >
      {text}
      <ArrowRight size={12} />
    </button>
  );
}

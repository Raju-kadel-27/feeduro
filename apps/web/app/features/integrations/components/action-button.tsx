import { ArrowRight } from "lucide-react";

interface Props {
  connected: boolean;
  onClick?: () => void;
}

export function IntegrationActionButton({ connected, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80 transition-colors"
    >
      {connected ? "Configure" : "Set up"}
      <ArrowRight size={12} />
    </button>
  );
}

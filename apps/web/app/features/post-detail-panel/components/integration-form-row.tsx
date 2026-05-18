import { X } from "lucide-react";

export function IntegrationFormRow({
  mode,
  input,
  placeholder,
  accentColor,
  creating,
  linking,
  onInputChange,
  onCreate,
  onLink,
  onSwitchToLink,
  onCancel,
}: {
  mode: "create" | "link";
  input: string;
  placeholder: string;
  accentColor: string;
  creating: boolean;
  linking: boolean;
  onInputChange: (v: string) => void;
  onCreate: () => void;
  onLink: () => void;
  onSwitchToLink: () => void;
  onCancel: () => void;
}) {
  if (mode === "create") {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onCreate}
          disabled={creating}
          className="px-2.5 py-1 text-xs font-medium rounded-md text-white disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {creating ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={onSwitchToLink}
          className="px-2.5 py-1 text-xs rounded-md hover:bg-muted border transition-colors"
        >
          Link existing
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <input
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder={placeholder}
        className="px-2 py-1 text-xs border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary w-36"
        onKeyDown={(e) => {
          if (e.key === "Enter" && input.trim()) onLink();
        }}
      />
      <button
        type="button"
        onClick={onLink}
        disabled={linking || !input.trim()}
        className="px-2.5 py-1 text-xs font-medium bg-foreground text-background rounded-md disabled:opacity-50"
      >
        {linking ? "Linking…" : "Link"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

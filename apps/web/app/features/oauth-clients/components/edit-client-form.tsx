import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { X } from "lucide-react";
import { useState } from "react";

interface Props {
  initialName: string;
  initialUris: string[];
  saving: boolean;
  onSave: (name: string, redirectUris: string[]) => void;
  onCancel: () => void;
}

export function EditClientForm({ initialName, initialUris, saving, onSave, onCancel }: Props) {
  const [name, setName] = useState(initialName);
  const [uris, setUris] = useState<string[]>(initialUris);
  const [uriInput, setUriInput] = useState("");

  function addUri(value: string) {
    const trimmed = value.trim();
    if (trimmed && !uris.includes(trimmed)) {
      setUris((prev) => [...prev, trimmed]);
    }
    setUriInput("");
  }

  function handleUriKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addUri(uriInput);
    }
    if (e.key === "Backspace" && !uriInput && uris.length > 0) {
      setUris((prev) => prev.slice(0, -1));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const allUris = uriInput.trim() ? [...uris, uriInput.trim()] : uris;
    if (!name.trim() || allUris.length === 0) return;
    onSave(name.trim(), allUris);
  }

  const hasUris = uris.length > 0 || uriInput.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* App name */}
      <div className="space-y-2">
        <label htmlFor="edit-oauth-name" className="text-sm font-medium text-foreground">
          App name
        </label>
        <Input
          id="edit-oauth-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Integration"
          required
          maxLength={64}
          className="h-10 text-sm"
        />
      </div>

      {/* Redirect URIs */}
      <div className="space-y-2">
        <div>
          <label className="text-sm font-medium text-foreground">Redirect URIs</label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Press Enter or comma to add each URI.
          </p>
        </div>
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: click delegates to inner input */}
        <div
          className="min-h-[80px] w-full flex flex-wrap gap-1.5 p-2.5 rounded-md border border-input bg-transparent text-sm shadow-sm focus-within:ring-1 focus-within:ring-ring transition-colors cursor-text"
          onClick={(e) => {
            (e.currentTarget as HTMLElement).querySelector("input")?.focus();
          }}
        >
          {uris.map((uri) => (
            <span
              key={uri}
              className="inline-flex items-center gap-1 bg-muted text-xs font-mono px-2 py-1 rounded-md max-w-full"
            >
              <span className="truncate max-w-[260px]" title={uri}>
                {uri}
              </span>
              <button
                type="button"
                onClick={() => setUris((prev) => prev.filter((u) => u !== uri))}
                aria-label={`Remove ${uri}`}
                className="text-muted-foreground hover:text-foreground shrink-0 ml-0.5 transition-colors"
              >
                <X size={11} />
              </button>
            </span>
          ))}
          <input
            value={uriInput}
            onChange={(e) => setUriInput(e.target.value)}
            onKeyDown={handleUriKeyDown}
            onBlur={() => addUri(uriInput)}
            placeholder={uris.length === 0 ? "https://myapp.com/callback" : "Add another…"}
            className="flex-1 min-w-[180px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 font-mono"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving || !name.trim() || !hasUris}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

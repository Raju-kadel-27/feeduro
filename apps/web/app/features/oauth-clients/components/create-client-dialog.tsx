import { Button } from "@components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog";
import { Plus, X } from "lucide-react";
import { useState } from "react";

export interface CreateClientData {
  name: string;
  redirectUris: string[];
  isPublic: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creating: boolean;
  onSubmit: (data: CreateClientData) => void;
}

export function CreateClientDialog({ open, onOpenChange, creating, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [uris, setUris] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  function addPendingUri(value: string) {
    const uri = value.trim();
    if (uri && !uris.includes(uri)) {
      setUris((prev) => [...prev, uri]);
    }
    setInputValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addPendingUri(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && uris.length > 0) {
      setUris((prev) => prev.slice(0, -1));
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setName("");
      setUris([]);
      setInputValue("");
      setIsPublic(false);
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const allUris = inputValue.trim() ? [...uris, inputValue.trim()] : uris;
    if (!name.trim() || allUris.length === 0) return;
    onSubmit({ name, redirectUris: allUris, isPublic });
  }

  const hasUris = uris.length > 0 || inputValue.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus size={16} />
          New App
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register OAuth App</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="oauth-name" className="text-sm text-muted-foreground">
              App name
            </label>
            <input
              id="oauth-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Integration"
              required
              maxLength={64}
              className="w-full px-4 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">
              Redirect URIs
              <span className="text-xs opacity-60 ml-1.5">— Enter or comma to add each</span>
            </label>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: click delegates to child input */}
            <div
              className="min-h-[72px] w-full flex flex-wrap gap-1.5 p-2.5 rounded-md border border-border bg-background focus-within:ring-2 focus-within:ring-ring cursor-text"
              onClick={(e) => {
                const input = (e.currentTarget as HTMLElement).querySelector("input");
                input?.focus();
              }}
            >
              {uris.map((uri) => (
                <span
                  key={uri}
                  className="inline-flex items-center gap-1 bg-muted text-xs font-mono px-2 py-0.5 rounded-md max-w-full"
                >
                  <span className="truncate max-w-[220px]" title={uri}>
                    {uri}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUris((prev) => prev.filter((u) => u !== uri))}
                    aria-label={`Remove ${uri}`}
                    className="text-muted-foreground hover:text-foreground shrink-0 ml-0.5"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => addPendingUri(inputValue)}
                placeholder={uris.length === 0 ? "https://myapp.com/callback" : "Add another…"}
                className="flex-1 min-w-[160px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 font-mono"
              />
            </div>
            {!hasUris && (
              <p className="text-xs text-muted-foreground/60">
                One URI per entry. Press Enter or comma to confirm.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="oauth-is-public"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="oauth-is-public" className="text-sm cursor-pointer">
              Public client{" "}
              <span className="text-muted-foreground text-xs">(native / SPA — no client secret)</span>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={creating || !name.trim() || !hasUris}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating…" : "Create App"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { Button } from "@components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import { Plus, X } from "lucide-react";
import { useState } from "react";

export interface CreateClientData {
  name: string;
  redirectUris: string[];
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
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const allUris = inputValue.trim() ? [...uris, inputValue.trim()] : uris;
    if (!name.trim() || allUris.length === 0) return;
    onSubmit({ name, redirectUris: allUris });
  }

  const hasUris = uris.length > 0 || inputValue.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus size={14} />
          New App
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Register OAuth App</DialogTitle>
          <DialogDescription>
            Create an app that can authenticate users via your workspace using OAuth 2.1.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {/* App name */}
          <div className="space-y-1.5">
            <label htmlFor="oauth-name" className="text-sm font-medium text-foreground">
              App name
            </label>
            <Input
              id="oauth-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Integration"
              required
              maxLength={64}
            />
          </div>

          {/* Redirect URIs tag input */}
          <div className="space-y-1.5">
            <div>
              <label className="text-sm font-medium text-foreground">
                Redirect URIs
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Press Enter or comma to add each URI.
              </p>
            </div>
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: click delegates to child input */}
            <div
              className="min-h-[76px] w-full flex flex-wrap gap-1.5 p-2.5 rounded-md border border-input bg-transparent text-sm shadow-sm focus-within:ring-1 focus-within:ring-ring transition-colors cursor-text"
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
                    className="text-muted-foreground hover:text-foreground shrink-0 ml-0.5 transition-colors"
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
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={creating || !name.trim() || !hasUris}
            >
              {creating ? "Creating…" : "Create App"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
